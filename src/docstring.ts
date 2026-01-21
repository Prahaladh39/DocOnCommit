import { parse } from "@babel/parser";
import traverse from "@babel/traverse";
import generate from "@babel/generator";
import * as t from "@babel/types";
import type { NodePath } from "@babel/traverse";

/**
 * Adds or updates docstrings for top-level functions
 */
export function updateDocstrings(
  sourceCode: string,
  docstringMap: Record<string, string>
): string {
  const ast = parse(sourceCode, {
    sourceType: "module",
    plugins: ["typescript", "jsx"],
  });

  traverse(ast, {
    FunctionDeclaration(path: NodePath<t.FunctionDeclaration>) {
      const name = path.node.id?.name;
      if (!name || !docstringMap[name]) return;

      path.node.leadingComments = [
        {
          type: "CommentBlock",
          value: `*\n${docstringMap[name]}\n `,
        },
      ];
    },

    VariableDeclaration(path: NodePath<t.VariableDeclaration>) {
      path.node.declarations.forEach((decl) => {
        if (t.isIdentifier(decl.id) && t.isArrowFunctionExpression(decl.init)) {
          const name = decl.id.name;
          if (!docstringMap[name]) return;

          path.node.leadingComments = [
            {
              type: "CommentBlock",
              value: `*\n${docstringMap[name]}\n `,
            },
          ];
        }
      });
    },
  });

  return generate(ast).code;
}
