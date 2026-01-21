import { getInstallationOctokit } from "./githubApp.ts";
import { analyzeDiff } from "./llm.ts";
import { generateMermaidDiagram } from "./diagram.ts";
import { loadConfig } from "./config.ts";
import { generateDocstrings } from "./docstringLlm.ts";
import { extractChangedFunctionsFromFiles } from "./diffParser.ts";
import { extractFunctionCode } from "./functionExtractor.ts";

/**
 * Simple in-memory rate limit to protect Gemini free tier
 * (1 run per minute max)
 */
let lastRunAt = 0;

function shouldGenerateDiagram(payload: any): boolean {
  if (!payload.commits || !Array.isArray(payload.commits)) {
    return false;
  }

  return payload.commits.some((commit: any) =>
    commit.message?.toLowerCase().includes("[diagram]"),
  );
}

export async function handlePushEvent(payload: any) {
  // 1️⃣ Ignore invalid / initial pushes
  if (payload.before === "0000000000000000000000000000000000000000") {
    console.log("Skipping initial commit push");
    return;
  }

  // 2️⃣ Only react to pushes on main branch
  if (payload.ref !== "refs/heads/main") {
    console.log("Skipping non-main branch push:", payload.ref);
    return;
  }

  // 3️⃣ Gemini rate-limit guard
  const now = Date.now();
  if (now - lastRunAt < 60_000) {
    console.log("Skipping run due to Gemini rate limit window");
    return;
  }
  lastRunAt = now;

  const config = loadConfig();
  if (!config.docstrings.enabled) {
    console.log("Docstring generation disabled via config");
  }

  const installationId = payload.installation.id;
  const octokit = await getInstallationOctokit(installationId);

  const owner = payload.repository.owner.login;
  const repo = payload.repository.name;
  const base = payload.before;
  const head = payload.after;

  console.log("Push detected:", owner, repo);

  // 4️⃣ Compare commits
  let diff;
  try {
    diff = await octokit.rest.repos.compareCommits({
      owner,
      repo,
      base,
      head,
    });
  } catch (err) {
    console.error("Failed to compare commits:", err);
    return;
  }

  console.log(
    "Changed files:",
    diff.data.files?.map((f: any) => ({
      file: f.filename,
      hasPatch: Boolean(f.patch),
    })),
  );

  // 5️⃣ Detect changed functions (FILE-AWARE)
  const changedFunctionsByFile = extractChangedFunctionsFromFiles(
    diff.data.files,
  );

  if (Object.keys(changedFunctionsByFile).length === 0) {
    console.log("No functions detected in diff");
  } else {
    console.log("Detected changed functions by file:");
    for (const [file, fns] of Object.entries(changedFunctionsByFile)) {
      console.log(`- ${file}: ${fns.join(", ")}`);
    }
  }

  // 👇 Store docstring suggestions PER FILE (final output)
  const docstringSuggestionsByFile: Record<string, Record<string, string>> = {};

  // 6️⃣ Docstring generation (PER FILE, SUGGEST MODE ONLY)
  for (const [fileName, functions] of Object.entries(changedFunctionsByFile)) {
    const file = diff.data.files?.find((f: any) => f.filename === fileName);
    if (!file || functions.length === 0) continue;

    try {
      // 1️⃣ Fetch FULL file content from GitHub
      const fileResponse: any = await octokit.rest.repos.getContent({
        owner,
        repo,
        path: fileName,
        ref: "main",
      });

      const fileCode = Buffer.from(
        fileResponse.data.content,
        "base64",
      ).toString("utf-8");

      // 2️⃣ Extract ONLY changed function bodies (Level-2 fix)
      const functionCode = extractFunctionCode(fileCode, functions);

      if (!functionCode.trim()) {
        console.log("No extractable function code for", fileName);
        continue;
      }

      // 3️⃣ Generate docstrings using ONLY function code
      const docstrings = await generateDocstrings(
        functions,
        functionCode,
        fileName,
      );

      if (Object.keys(docstrings).length > 0) {
        docstringSuggestionsByFile[fileName] = docstrings;

        console.log("Docstring suggestions for", fileName);
        for (const [fn, doc] of Object.entries(docstrings)) {
          console.log(`\nFunction: ${fn}`);
          console.log(doc);
        }
      }
    } catch (err) {
      console.error(`Docstring generation failed for ${fileName}`, err);
    }
  }

  // 7️⃣ README update
  if (!config.update_readme) {
    console.log("README updates disabled via config");
    return;
  }

  const combinedPatch = (diff.data.files ?? [])
    .map((f: { patch?: string }) => f.patch)
    .filter((p): p is string => typeof p === "string")
    .join("\n");

  if (!combinedPatch.trim()) {
    console.log("No meaningful diff found, skipping");
    return;
  }

  //let finalReadme = await analyzeDiff(combinedPatch);
  let finalReadme = "";

  try {
    finalReadme = await analyzeDiff(combinedPatch);
  } catch (err) {
    console.error("README generation failed, skipping README update");
    finalReadme = "";
  }

  // 8️⃣ Optional diagram generation
  const wantsDiagram =
    config.generate_diagram &&
    config.diagram_trigger === "commit_message" &&
    shouldGenerateDiagram(payload);

  if (wantsDiagram) {
    try {
      const diagram = await generateMermaidDiagram(combinedPatch);
      if (diagram) {
        finalReadme += `

## Architecture

\`\`\`mermaid
${diagram}
\`\`\`
`;
      }
    } catch {
      console.error("Diagram generation failed, continuing");
    }
  }

  // 9️⃣ Create PR + PR comment
  const hasReadmeUpdate = finalReadme.trim().length > 0;
  const hasDocstrings =
    docstringSuggestionsByFile &&
    Object.keys(docstringSuggestionsByFile).length > 0;

  if (!hasReadmeUpdate && !hasDocstrings) {
    console.log("Nothing to create PR for, skipping");
    return;
  }

  await createPullRequest(
    octokit,
    owner,
    repo,
    finalReadme,
    docstringSuggestionsByFile,
  );
}

async function createPullRequest(
  octokit: any,
  owner: string,
  repo: string,
  readmeContent: string,
  docstringSuggestionsByFile: Record<string, Record<string, string>>,
) {
  const branch = `docsync-${Date.now()}`;

  const { data: ref } = await octokit.rest.git.getRef({
    owner,
    repo,
    ref: "heads/main",
  });

  await octokit.rest.git.createRef({
    owner,
    repo,
    ref: `refs/heads/${branch}`,
    sha: ref.object.sha,
  });

  // Update README
  if (readmeContent && readmeContent.trim().length > 0) {
    const { data: readme }: any = await octokit.rest.repos.getContent({
      owner,
      repo,
      path: "README.md",
      ref: branch,
    });

    await octokit.rest.repos.createOrUpdateFileContents({
      owner,
      repo,
      path: "README.md",
      message: "docs: auto-update documentation",
      content: Buffer.from(readmeContent).toString("base64"),
      sha: readme.sha,
      branch,
    });
  }

  const pr = await octokit.rest.pulls.create({
    owner,
    repo,
    title: "docs: sync documentation with code changes",
    head: branch,
    base: "main",
    body: "Automated documentation update by DocSync bot 🤖",
  });

  // PR comment with docstring suggestions (FILE-SAFE)
  if (Object.keys(docstringSuggestionsByFile).length > 0) {
    const lines: string[] = [];

    lines.push("### 🤖 Docstring Suggestions");
    lines.push("");

    for (const [file, docstrings] of Object.entries(
      docstringSuggestionsByFile,
    )) {
      lines.push(`#### 📄 ${file}`);
      lines.push("");

      for (const [fn, doc] of Object.entries(docstrings)) {
        lines.push(`**Function:** \`${fn}\``);
        lines.push("");
        lines.push("```js");
        lines.push(doc);
        lines.push("```");
        lines.push("");
      }
    }

    await octokit.rest.issues.createComment({
      owner,
      repo,
      issue_number: pr.data.number,
      body: lines.join("\n"),
    });
  }

  console.log("Pull request created successfully");
}
