/**
 * Extracts ONLY the code bodies of the specified functions from a JS/TS file.
 * This prevents LLM hallucination and repeated docstrings.
 *
 * Supported patterns:
 * - function foo() {}
 * - async function foo() {}
 * - const foo = (...) => {}
 * - const foo = async (...) => {}
 */
export function extractFunctionCode(
  fileCode: string,
  functionNames: string[],
): string {
  const extracted: string[] = [];

  for (const fnName of functionNames) {
    // Match function declarations
    const patterns = [
      // async function foo(...) { ... }
      new RegExp(
        `async\\s+function\\s+${fnName}\\s*\\([^)]*\\)\\s*\\{[\\s\\S]*?\\n\\}`,
        "g",
      ),

      // function foo(...) { ... }
      new RegExp(
        `function\\s+${fnName}\\s*\\([^)]*\\)\\s*\\{[\\s\\S]*?\\n\\}`,
        "g",
      ),

      // const foo = async (...) => { ... }
      new RegExp(
        `const\\s+${fnName}\\s*=\\s*async\\s*\\([^)]*\\)\\s*=>\\s*\\{[\\s\\S]*?\\n\\}`,
        "g",
      ),

      // const foo = (...) => { ... }
      new RegExp(
        `const\\s+${fnName}\\s*=\\s*\\([^)]*\\)\\s*=>\\s*\\{[\\s\\S]*?\\n\\}`,
        "g",
      ),
    ];

    for (const pattern of patterns) {
      const match = fileCode.match(pattern);
      if (match) {
        extracted.push(match[0]);
        break;
      }
    }
  }

  return extracted.join("\n\n");
}
