//
// Copyright 2020 DXOS.org
//

import assert from 'assert';
import { readFileSync } from 'fs';
import { dirname, relative } from 'path';
import * as ts from 'typescript';

import { ModuleSpecifier } from './module-specifier';

export interface ImportDescriptor {
  clause: ts.ImportClause,
  module: ModuleSpecifier,
}

export interface SubstitutedType {
  typeNode: ts.TypeNode,
  name: string,
}

/**
 * Protobuf FQN => Typescript identifier mapping
 */
export type SubstitutionsMap = Partial<Record<string, SubstitutedType>>

const diagnosticsHost: ts.FormatDiagnosticsHost = {
  getCanonicalFileName: fileName => relative(process.cwd(), fileName),
  getCurrentDirectory: ts.sys.getCurrentDirectory,
  getNewLine: () => ts.sys.newLine
};

const parseConfigHost: ts.ParseConfigFileHost = {
  fileExists: ts.sys.fileExists,
  getCurrentDirectory: ts.sys.getCurrentDirectory,
  readDirectory: ts.sys.readDirectory,
  readFile: ts.sys.readFile,
  useCaseSensitiveFileNames: true,
  onUnRecoverableConfigFileDiagnostic: diagnostic => process.stdout.write(ts.formatDiagnostic(diagnostic, diagnosticsHost))
};

function getTsCompilerOptions (searchPath: string): ts.CompilerOptions {
  const configFileName = ts.findConfigFile(searchPath, ts.sys.fileExists);
  if (!configFileName) return {};
  const configJson = ts.readJsonConfigFile(configFileName, path => readFileSync(path, { encoding: 'utf-8' }));
  const basePath = dirname(configFileName);
  const config = ts.parseJsonSourceFileConfigFileContent(configJson, parseConfigHost, basePath, undefined, configFileName);
  return config.options;
}

export function parseSubstitutionsFile (fileName: string) {
  const compilerOptions = getTsCompilerOptions(dirname(fileName));
  const program = ts.createProgram([fileName], compilerOptions);
  const sourceFile = program.getSourceFile(fileName)!;
  const typeChecker = program.getTypeChecker();

  const imports: ImportDescriptor[] = [];
  const substitutions: SubstitutionsMap = {};
  ts.forEachChild(sourceFile, node => {
    if (ts.isExportAssignment(node)) {
      const obj = node.expression;

      const type = typeChecker.getTypeAtLocation(obj);
      const members = (type as any).members as Map<string, ts.Symbol>;
      for (const [key, symbol] of members) {
        const symbolType = typeChecker.getTypeOfSymbolAtLocation(symbol, symbol.valueDeclaration);
        const decodeSymbol = (symbolType as any).members.get('decode') as ts.Symbol;
        const decodeSymbolType = typeChecker.getTypeOfSymbolAtLocation(decodeSymbol, decodeSymbol.valueDeclaration);
        const callsignature = decodeSymbolType.getCallSignatures()[0];
        const returnType = typeChecker.getReturnTypeOfSignature(callsignature);

        // TODO(marik-d): Figure out when to display diagnostics.
        // if(returnType) {
        //   const diagnostics = program.getSemanticDiagnostics();
        //   process.stdout.write(ts.formatDiagnostics(diagnostics, diagnosticsHost));
        //   throw new Error('Failed to parse substitutions file')
        // }

        const typeNode = typeChecker.typeToTypeNode(returnType, undefined, undefined);
        assert(typeNode);
        substitutions[key] = {
          typeNode,
          name: typeChecker.typeToString(returnType)
        };
      }
    } else if (ts.isImportDeclaration(node)) {
      if (ts.isStringLiteral(node.moduleSpecifier) && node.importClause) {
        imports.push({
          clause: node.importClause,
          module: new ModuleSpecifier(node.moduleSpecifier.text, dirname(sourceFile.fileName))
        });
      }
    }
  });

  return { imports, substitutions };
}
