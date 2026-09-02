import type ts from "typescript";
import type { LanguageAnalysisInput } from "@execlens/protocol";
import type { LanguageParameterField } from "@execlens/protocol";

export type {
  LanguageAdapter,
  LanguageAnalysisInput,
  LanguageDocumentSymbol,
  LanguageFunctionInfo,
  LanguageParameterField,
  LanguageSymbolKind
} from "@execlens/protocol";

export type AnalyzeInput = LanguageAnalysisInput;

export type TypeDeclaration = ts.InterfaceDeclaration | ts.TypeAliasDeclaration;
export type FunctionNode = ts.FunctionDeclaration | ts.MethodDeclaration | ts.ConstructorDeclaration;

export type InputMode = {
  control: LanguageParameterField["control"] | undefined;
  options: Array<{ label: string; value: string }> | undefined;
};
