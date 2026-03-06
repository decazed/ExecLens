import * as vscode from "vscode";

export function activate(context: vscode.ExtensionContext): void {
  const refreshFunctionContext = async (editor: vscode.TextEditor | undefined): Promise<void> => {
    const functionSymbol = await getFunctionSymbolUnderCursor(editor);
    await vscode.commands.executeCommand("setContext", "execlens.isFunctionUnderCursor", Boolean(functionSymbol));
  };

  const disposable = vscode.commands.registerCommand("execlens.openSimulator", async () => {
    const functionName = await getFunctionNameUnderCursor();
    const mediaRoot = vscode.Uri.joinPath(context.extensionUri, "media");
    const panel = vscode.window.createWebviewPanel(
      "execlens.simulator",
      "Execlens Simulator",
      vscode.ViewColumn.Beside,
      {
        localResourceRoots: [mediaRoot]
      }
    );

    panel.webview.html = await getWebviewHtml(panel.webview, mediaRoot, functionName);
  });

  void refreshFunctionContext(vscode.window.activeTextEditor);

  const activeEditorListener = vscode.window.onDidChangeActiveTextEditor((editor) => {
    void refreshFunctionContext(editor);
  });

  const selectionListener = vscode.window.onDidChangeTextEditorSelection((event) => {
    void refreshFunctionContext(event.textEditor);
  });

  context.subscriptions.push(disposable, activeEditorListener, selectionListener);
}

export function deactivate(): void {}

async function getWebviewHtml(
  webview: vscode.Webview,
  mediaRoot: vscode.Uri,
  functionName: string
): Promise<string> {
  const htmlPath = vscode.Uri.joinPath(mediaRoot, "index.html");
  const cssPath = vscode.Uri.joinPath(mediaRoot, "styles.css");

  const htmlBytes = await vscode.workspace.fs.readFile(htmlPath);
  const html = Buffer.from(htmlBytes).toString("utf-8");
  const stylesUri = webview.asWebviewUri(cssPath).toString();

  return html
    .replaceAll("{{cspSource}}", webview.cspSource)
    .replaceAll("{{stylesUri}}", stylesUri)
    .replaceAll("{{functionName}}", escapeHtml(functionName));
}

async function getFunctionNameUnderCursor(): Promise<string> {
  const editor = vscode.window.activeTextEditor;
  const functionSymbol = await getFunctionSymbolUnderCursor(editor);
  if (functionSymbol) {
    return functionSymbol.name;
  }

  if (!editor) {
    return "No active editor";
  }

  const hasSymbols = await hasAnyDocumentSymbols(editor.document.uri);
  return hasSymbols ? "No function under cursor" : "No function found";
}

async function getFunctionSymbolUnderCursor(
  editor: vscode.TextEditor | undefined
): Promise<vscode.DocumentSymbol | null> {
  if (!editor) {
    return null;
  }

  const symbols = await getDocumentSymbols(editor.document.uri);
  if (symbols.length === 0) {
    return null;
  }

  const cursor = editor.selection.active;
  const functionKinds = new Set<vscode.SymbolKind>([
    vscode.SymbolKind.Function,
    vscode.SymbolKind.Method,
    vscode.SymbolKind.Constructor
  ]);

  const candidates = flattenDocumentSymbols(symbols).filter(
    (symbol) => functionKinds.has(symbol.kind) && symbol.range.contains(cursor)
  );
  if (candidates.length === 0) {
    return null;
  }

  let best: vscode.DocumentSymbol | null = null;
  for (const candidate of candidates) {
    if (!best || symbolRangeSize(editor.document, candidate) < symbolRangeSize(editor.document, best)) {
      best = candidate;
    }
  }

  return best;
}

async function hasAnyDocumentSymbols(documentUri: vscode.Uri): Promise<boolean> {
  const symbols = await getDocumentSymbols(documentUri);
  return symbols.length > 0;
}

async function getDocumentSymbols(documentUri: vscode.Uri): Promise<vscode.DocumentSymbol[]> {
  const symbols = await vscode.commands.executeCommand<vscode.DocumentSymbol[]>(
    "vscode.executeDocumentSymbolProvider",
    documentUri
  );
  return symbols ?? [];
}

function flattenDocumentSymbols(symbols: vscode.DocumentSymbol[]): vscode.DocumentSymbol[] {
  const result: vscode.DocumentSymbol[] = [];

  for (const symbol of symbols) {
    result.push(symbol);
    result.push(...flattenDocumentSymbols(symbol.children));
  }

  return result;
}

function symbolRangeSize(document: vscode.TextDocument, symbol: vscode.DocumentSymbol): number {
  return document.offsetAt(symbol.range.end) - document.offsetAt(symbol.range.start);
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}
