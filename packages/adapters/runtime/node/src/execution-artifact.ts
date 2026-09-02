import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import ts from "typescript";

export type ExecutionArtifact = {
  moduleSpecifier: string;
  cleanupDir?: string;
};

export async function prepareExecutionArtifact(filePath: string): Promise<ExecutionArtifact> {
  const extension = path.extname(filePath).toLowerCase();
  if (extension === ".js" || extension === ".mjs" || extension === ".cjs") {
    return { moduleSpecifier: pathToFileURL(filePath).href };
  }

  if (extension === ".ts" || extension === ".mts" || extension === ".cts" || extension === ".tsx") {
    return transpileTypeScriptFile(filePath);
  }

  throw new Error(`Unsupported file type: ${extension || "unknown"}`);
}

export async function cleanupExecutionArtifact(artifact: ExecutionArtifact): Promise<void> {
  if (artifact.cleanupDir) {
    await rm(artifact.cleanupDir, { recursive: true, force: true });
  }
}

async function transpileTypeScriptFile(filePath: string): Promise<ExecutionArtifact> {
  const tempDir = await mkdtemp(path.join(os.tmpdir(), "execlens-runtime-"));
  const source = await readFile(filePath, "utf-8");
  const transpiled = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.ES2022,
      target: ts.ScriptTarget.ES2022
    },
    fileName: filePath
  });

  const outputPath = path.join(tempDir, `${path.basename(filePath, path.extname(filePath))}.mjs`);
  await writeFile(outputPath, transpiled.outputText, "utf-8");
  return {
    moduleSpecifier: pathToFileURL(outputPath).href,
    cleanupDir: tempDir
  };
}
