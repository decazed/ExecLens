export const SymbolKind = {
  Method: 5,
  Function: 11,
  Constructor: 8
} as const;

export const ViewColumn = {
  Beside: 2
} as const;

export const commands = {
  executeCommand: async (): Promise<unknown> => undefined,
  registerCommand: (): Disposable => ({ dispose() {} })
};

export const window = {
  activeTextEditor: undefined,
  createWebviewPanel: (): never => {
    throw new Error("createWebviewPanel mock was not configured.");
  },
  onDidChangeActiveTextEditor: (): Disposable => ({ dispose() {} }),
  onDidChangeTextEditorSelection: (): Disposable => ({ dispose() {} })
};

export type Disposable = {
  dispose(): void;
};
