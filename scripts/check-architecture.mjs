import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";

const workspaceRoot = process.cwd();

const rules = [
  {
    name: "protocol has no workspace dependencies",
    root: "packages/protocol/src",
    allowedWorkspaceImports: []
  },
  {
    name: "core depends only on protocol",
    root: "packages/core/src",
    allowedWorkspaceImports: ["@execlens/protocol"],
    forbiddenImports: ["typescript", "vscode"]
  },
  {
    name: "ui depends only on protocol",
    root: "packages/ui/src",
    allowedWorkspaceImports: ["@execlens/protocol"]
  },
  {
    name: "language adapters do not depend on core, UI, IDE, or runtime adapters",
    root: "packages/adapters/language",
    allowedWorkspaceImports: ["@execlens/protocol"]
  },
  {
    name: "runtime adapters do not depend on core, UI, IDE, or language adapters",
    root: "packages/adapters/runtime",
    allowedWorkspaceImports: ["@execlens/protocol"]
  }
];

const importPattern =
  /\bimport\s+(?:type\s+)?(?:[^"']+\s+from\s+)?["']([^"']+)["']|\bexport\s+(?:type\s+)?[^"']+\s+from\s+["']([^"']+)["']|\bimport\s*\(\s*["']([^"']+)["']\s*\)/g;

const violations = [];

for (const rule of rules) {
  const absoluteRoot = path.join(workspaceRoot, rule.root);
  for (const filePath of listSourceFiles(absoluteRoot)) {
    const source = readFileSync(filePath, "utf-8");
    for (const specifier of findImportSpecifiers(source)) {
      if (specifier.startsWith("@execlens/") && !isAllowedWorkspaceImport(specifier, rule.allowedWorkspaceImports)) {
        violations.push({
          rule: rule.name,
          filePath,
          specifier,
          message: `workspace import "${specifier}" is not allowed here`
        });
      }

      if (rule.forbiddenImports?.some((forbidden) => specifier === forbidden || specifier.startsWith(`${forbidden}/`))) {
        violations.push({
          rule: rule.name,
          filePath,
          specifier,
          message: `import "${specifier}" is forbidden here`
        });
      }
    }
  }
}

if (violations.length > 0) {
  for (const violation of violations) {
    const relativePath = path.relative(workspaceRoot, violation.filePath);
    console.error(`[architecture] ${violation.rule}`);
    console.error(`  ${relativePath}: ${violation.message}`);
  }
  process.exit(1);
}

console.log("Architecture boundaries OK");

function listSourceFiles(rootDir) {
  const files = [];
  for (const entry of readdirSync(rootDir)) {
    const absolutePath = path.join(rootDir, entry);
    const stats = statSync(absolutePath);
    if (stats.isDirectory()) {
      if (entry !== "dist" && entry !== "node_modules") {
        files.push(...listSourceFiles(absolutePath));
      }
      continue;
    }

    if (absolutePath.endsWith(".ts") || absolutePath.endsWith(".js")) {
      files.push(absolutePath);
    }
  }
  return files;
}

function findImportSpecifiers(source) {
  const specifiers = [];
  for (const match of source.matchAll(importPattern)) {
    const specifier = match[1] ?? match[2] ?? match[3];
    if (specifier) {
      specifiers.push(specifier);
    }
  }
  return specifiers;
}

function isAllowedWorkspaceImport(specifier, allowedImports) {
  return allowedImports.some((allowedImport) => specifier === allowedImport || specifier.startsWith(`${allowedImport}/`));
}
