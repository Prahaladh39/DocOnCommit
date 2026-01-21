/**
 * Extract changed function names from GitHub diff files
 * Groups functions by file to preserve attribution
 * (JS / TS only, handles function BODY changes)
 */
export function extractChangedFunctionsFromFiles(
  files: any[] = [],
): Record<string, string[]> {
  const result: Record<string, Set<string>> = {};

  for (const file of files) {
    if (!file.patch) continue;
    if (!file.filename.endsWith(".js") && !file.filename.endsWith(".ts")) {
      continue;
    }

    const lines = file.patch.split("\n");
    let currentFunction: string | null = null;

    for (const rawLine of lines) {
      // Remove diff markers (+, -, space)
      const line = rawLine.replace(/^[-+ ]/, "").trim();

      // Detect function declaration
      const match =
        line.match(/export\s+function\s+([a-zA-Z0-9_]+)/) ||
        line.match(/function\s+([a-zA-Z0-9_]+)/) ||
        line.match(/const\s+([a-zA-Z0-9_]+)\s*=\s*\(/) ||
        line.match(/let\s+([a-zA-Z0-9_]+)\s*=\s*\(/);

      if (match) {
        currentFunction = match[1];
        continue;
      }

      // If an added line appears inside a function body
      if (rawLine.startsWith("+") && currentFunction) {
        if (!result[file.filename]) {
          result[file.filename] = new Set();
        }
        result[file.filename].add(currentFunction);
      }
    }
  }

  // Convert Sets to arrays
  const finalResult: Record<string, string[]> = {};
  for (const [file, funcs] of Object.entries(result)) {
    finalResult[file] = Array.from(funcs);
  }

  return finalResult;
}
