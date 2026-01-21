import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

export async function generateMermaidDiagram(diff: string): Promise<string> {
  const model = genAI.getGenerativeModel({
    model: "gemini-2.5-flash",
  });

  const prompt = `
You are a software architect.

Based ONLY on the git diff below, infer a HIGH-LEVEL system architecture.

Rules:
- Use Mermaid "graph TD"
- Prefer concrete components (Frontend, API, Database)
- If HTML or JS is present, include "Frontend"
- If fetch() or HTTP is present, include "API"
- Keep it simple but meaningful
- Return ONLY Mermaid code (no backticks, no explanations)

GIT DIFF:
${diff}
`;

  const result = await model.generateContent(prompt);
  return result.response.text().trim();
}
