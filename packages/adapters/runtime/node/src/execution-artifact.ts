import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import ts from "typescript";

export type ExecutionArtifact = {
  moduleSpecifier: string;
  cleanupDir?: string;
};

const JS_EXTENSIONS = [".js", ".mjs", ".cjs"];
const TS_EXTENSIONS = [".ts", ".mts", ".cts", ".tsx"];

export const SUPPORTED_EXTENSIONS = [...JS_EXTENSIONS, ...TS_EXTENSIONS];

export function isSupportedFile(filePath: string): boolean {
  return SUPPORTED_EXTENSIONS.includes(path.extname(filePath).toLowerCase());
}

export async function prepareExecutionArtifact(filePath: string): Promise<ExecutionArtifact> {
  const extension = path.extname(filePath).toLowerCase();
  if (JS_EXTENSIONS.includes(extension)) {
    return { moduleSpecifier: pathToFileURL(filePath).href };
  }

  if (TS_EXTENSIONS.includes(extension)) {
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
