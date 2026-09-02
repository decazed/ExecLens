import * as vscode from "vscode";
import { analyzeFunctionContext, selectLanguageAdapter } from "@execlens/core";
import type {
  LanguageAdapter,
  LanguageFunctionInfo,
  SimulatorFunctionInfo,
  SimulatorParameterField
} from "@execlens/protocol";
import { toLanguageSymbol } from "./mappers/document-symbol.mapper.js";

export class VsCodeFunctionContextService {
  private readonly languageAdapters: readonly LanguageAdapter[];

  public constructor(languageAdapters: readonly LanguageAdapter[]) {
    this.languageAdapters = languageAdapters;
  }

  public async analyzeCurrentFunction(editor: vscode.TextEditor | undefined): Promise<LanguageFunctionInfo | null> {
    if (!editor) {
      return null;
    }

    const languageAdapter = selectLanguageAdapter(this.languageAdapters, editor.document.languageId);
    if (!languageAdapter) {
      return null;
    }

    const symbols = await this.getDocumentSymbols(editor.document.uri);
    if (symbols.length === 0) {
      return null;
    }

    const languageSymbols = symbols.map((symbol) => toLanguageSymbol(editor.document, symbol));
    return analyzeFunctionContext(languageAdapter, {
      documentText: editor.document.getText(),
      fileName: editor.document.fileName,
      languageId: editor.document.languageId,
      cursorOffset: editor.document.offsetAt(editor.selection.active),
      symbols: languageSymbols
    });
  }

  public async getFunctionInfoUnderCursor(
    editor: vscode.TextEditor | undefined
  ): Promise<SimulatorFunctionInfo> {
    if (!editor) {
      return { name: "No active editor", parameters: [] };
    }

    const functionInfo = await this.analyzeCurrentFunction(editor);
    if (functionInfo) {
      return {
        ...functionInfo,
        target: {
          kind: "function",
          filePath: editor.document.fileName,
          functionName: functionInfo.name,
          parameterNames: functionInfo.parameters.map((parameter: SimulatorParameterField) => parameter.name)
        }
      };
    }

    const symbols = await this.getDocumentSymbols(editor.document.uri);
    return { name: symbols.length > 0 ? "No function under cursor" : "No function found", parameters: [] };
  }

  private async getDocumentSymbols(documentUri: vscode.Uri): Promise<vscode.DocumentSymbol[]> {
    const symbols = await vscode.commands.executeCommand<vscode.DocumentSymbol[]>(
      "vscode.executeDocumentSymbolProvider",
      documentUri
    );
    return symbols ?? [];
  }
}
