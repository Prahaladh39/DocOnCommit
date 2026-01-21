import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

export async function analyzeDiff(diff: string): Promise<string> {
  const model = genAI.getGenerativeModel({
    model: "gemini-2.5-flash",
  });

  const prompt = `
You are a documentation bot.

Your job:
- Read a git diff
- Update ONLY the relevant parts of README.md
- Keep it professional and concise
- Do NOT explain the diff
- Output pure Markdown

GIT DIFF:
${diff}
`;

  const result = await model.generateContent(prompt);
  const response = result.response;

  return response.text();
}
