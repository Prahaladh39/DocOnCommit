import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

const MODELS = [
  "gemini-2.5-flash", // fast, cheap
  "gemini-2.0-flash", // fallback
];

async function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

export async function generateDocstrings(
  functions: string[],
  fileCode: string,
  fileName?: string,
): Promise<Record<string, string>> {
  const prompt = `
You are a senior software engineer.

Generate JSDoc-style docstrings ONLY for the functions listed below.

STRICT RULES:
- Output VALID JSON ONLY
- Do NOT wrap in markdown
- Do NOT use backticks
- Do NOT add explanations
- Keys must exactly match function names
- Do NOT include functions not listed
- Do NOT infer functions outside the given code
- If a function returns a Promise, explicitly document it as asynchronous

File: ${fileName ?? "unknown"}

Functions:
${functions.join(", ")}

Code:
${fileCode}

Expected output:
{
  "functionName": "Docstring text"
}
`;

  let lastError: any;

  for (const modelName of MODELS) {
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        const model = genAI.getGenerativeModel({ model: modelName });
        const result = await model.generateContent(prompt);

        const rawText = result.response.text();
        const cleaned = rawText
          .replace(/```json/gi, "")
          .replace(/```/g, "")
          .trim();

        return JSON.parse(cleaned);
      } catch (err: any) {
        lastError = err;

        // Retry only on overload / 5xx
        if (err?.status === 503 || err?.status === 500) {
          const wait = attempt * 1500;
          console.warn(
            `Gemini overloaded (${modelName}), retry ${attempt}/3 in ${wait}ms`,
          );
          await sleep(wait);
          continue;
        }

        // Hard failure → do not retry
        throw err;
      }
    }
  }

  console.error("All Gemini attempts failed. Skipping docstrings.");
  throw lastError;
}
