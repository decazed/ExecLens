import path from "node:path";
import ts from "typescript";

export function createTypeCheckerContext(input: {
  documentText: string;
  fileName: string;
  scriptKind: ts.ScriptKind;
}): { program: ts.Program; sourceFile: ts.SourceFile } | null {
  const { documentText, fileName, scriptKind } = input;
  const configPath = ts.findConfigFile(path.dirname(fileName), ts.sys.fileExists, "tsconfig.json");
  if (!configPath) {
    return null;
  }

  const configFile = ts.readConfigFile(configPath, ts.sys.readFile);
  if (configFile.error) {
    return null;
  }

  const parsed = ts.parseJsonConfigFileContent(configFile.config, ts.sys, path.dirname(configPath));
  const normalizedDocPath = normalizeFilePath(fileName);
  const hasDocInRoots = parsed.fileNames.some((name) => normalizeFilePath(name) === normalizedDocPath);
  const rootNames = hasDocInRoots ? parsed.fileNames : [...parsed.fileNames, fileName];

  const host = ts.createCompilerHost(parsed.options, true);
  const originalGetSourceFile = host.getSourceFile.bind(host);
  host.getSourceFile = (hostFileName, languageVersion, onError, shouldCreateNewSourceFile) => {
    if (normalizeFilePath(hostFileName) === normalizedDocPath) {
      return ts.createSourceFile(hostFileName, documentText, languageVersion, true, scriptKind);
    }
    return originalGetSourceFile(hostFileName, languageVersion, onError, shouldCreateNewSourceFile);
  };

  const program = ts.createProgram({
    rootNames,
    options: parsed.options,
    host
  });

  const sourceFile =
    program.getSourceFile(fileName) ??
    program.getSourceFiles().find((file) => normalizeFilePath(file.fileName) === normalizedDocPath);
  if (!sourceFile) {
    return null;
  }

  return { program, sourceFile };
}

function normalizeFilePath(fileName: string): string {
  const normalized = path.normalize(fileName);
  return ts.sys.useCaseSensitiveFileNames ? normalized : normalized.toLowerCase();
}
