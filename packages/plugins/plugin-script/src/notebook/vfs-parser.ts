//
// Copyright 2025 DXOS.org
//

import { createSystem, createVirtualTypeScriptEnvironment } from '@typescript/vfs';
import ts from 'typescript';

import { trim } from '@dxos/util';

export type ParsedExpression = {
  name?: string;
  type?: 'function' | 'variable' | 'class' | 'interface';
  valueType?: string;
  parameters?: Array<{ name: string; type: string }>;
  returnType?: string;
  references?: string[];
};

export type VirtualFile = {
  fileName: string;
  content: string;
};

/**
 * TypeScript parser using Virtual File System for browser compatibility.
 * This provides full TypeScript analysis including type information.
 */
export class VirtualTypeScriptParser {
  protected compilerOptions: ts.CompilerOptions = {
    target: ts.ScriptTarget.ES2020,
    module: ts.ModuleKind.ESNext,
    strict: true,
    esModuleInterop: true,
    skipLibCheck: true,
    forceConsistentCasingInFileNames: true,
    jsx: ts.JsxEmit.React,
    noLib: true, // Don't automatically include default lib files.
  };

  /**
   * Parse a single expression or statement.
   */
  parseExpression(input: string): ParsedExpression {
    const files: VirtualFile[] = [{ fileName: '/temp.ts', content: input }];

    const analysis = this.analyzeFiles(files);

    // If no declarations found, check for standalone expression references
    if (analysis.length === 0) {
      const fsMap = new Map<string, string>();
      fsMap.set('/temp.ts', input);
      fsMap.set(
        '/lib.d.ts',
        trim`
          interface Array<T> { length: number; [n: number]: T; }
          interface Boolean {}
          interface Function {}
          interface IArguments {}
          interface Number {}
          interface Object {}
          interface RegExp {}
          interface String { length: number; }
          interface CallableFunction extends Function {}
          interface NewableFunction extends Function {}
          declare var console: { log(...args: any[]): void };
        `,
      );

      const system = createSystem(fsMap);
      const env = createVirtualTypeScriptEnvironment(system, ['/temp.ts', '/lib.d.ts'], ts, this.compilerOptions);

      const sourceFile = env.getSourceFile('/temp.ts');
      const typeChecker = env.languageService.getProgram()?.getTypeChecker();

      if (sourceFile && typeChecker) {
        const references = this.findAllReferences(sourceFile, typeChecker);
        return { references };
      }
    }

    return analysis[0] || {};
  }

  /**
   * Analyze multiple files with full type information.
   */
  analyzeFiles(files: VirtualFile[]): ParsedExpression[] {
    // Create virtual file system
    const fsMap = new Map<string, string>();
    files.forEach((file) => {
      fsMap.set(file.fileName, file.content);
    });

    // Add minimal TypeScript lib content to avoid errors
    fsMap.set(
      '/lib.d.ts',
      trim`
        interface Array<T> { length: number; [n: number]: T; }
        interface Boolean {}
        interface Function {}
        interface IArguments {}
        interface Number {}
        interface Object {}
        interface RegExp {}
        interface String { length: number; }
        interface CallableFunction extends Function {}
        interface NewableFunction extends Function {}
        declare var console: { log(...args: any[]): void };
      `,
    );

    // Add TypeScript lib files for browser environment.
    const system = createSystem(fsMap);

    // Create virtual TypeScript environment.
    const env = createVirtualTypeScriptEnvironment(
      system,
      [...files.map((f) => f.fileName), '/lib.d.ts'],
      ts,
      this.compilerOptions,
    );

    const results: ParsedExpression[] = [];
    const typeChecker = env.languageService.getProgram()?.getTypeChecker();

    // Analyze each file
    files.forEach((file) => {
      const sourceFile = env.getSourceFile(file.fileName);
      if (!sourceFile || !typeChecker) return;

      const fileResults = this.analyzeSourceFile(sourceFile, typeChecker);
      results.push(...fileResults);
    });

    return results;
  }

  /**
   * Analyze a source file with type information.
   */
  protected analyzeSourceFile(sourceFile: ts.SourceFile, typeChecker: ts.TypeChecker): ParsedExpression[] {
    const results: ParsedExpression[] = [];

    const visit = (node: ts.Node) => {
      // Function declarations
      if (ts.isFunctionDeclaration(node) && node.name) {
        const symbol = typeChecker.getSymbolAtLocation(node.name);
        const type = symbol && typeChecker.getTypeOfSymbolAtLocation(symbol, node);
        const signature = type && typeChecker.getSignaturesOfType(type, ts.SignatureKind.Call)[0];

        results.push({
          name: node.name.text,
          type: 'function',
          parameters: this.extractParameters(signature, typeChecker),
          returnType: signature ? typeChecker.typeToString(signature.getReturnType()) : 'any',
          references: this.findReferences(node, sourceFile, typeChecker),
        });
      }

      // Variable declarations.
      else if (ts.isVariableStatement(node)) {
        node.declarationList.declarations.forEach((declaration) => {
          if (ts.isIdentifier(declaration.name)) {
            const symbol = typeChecker.getSymbolAtLocation(declaration.name);
            const type = symbol && typeChecker.getTypeOfSymbolAtLocation(symbol, declaration);

            let kind: 'function' | 'variable' = 'variable';
            let parameters: Array<{ name: string; type: string }> | undefined;
            let returnType: string | undefined;

            // Check if it's a function.
            if (declaration.initializer) {
              if (ts.isArrowFunction(declaration.initializer) || ts.isFunctionExpression(declaration.initializer)) {
                kind = 'function';
                const funcType = typeChecker.getTypeAtLocation(declaration.initializer);
                const signature = typeChecker.getSignaturesOfType(funcType, ts.SignatureKind.Call)[0];
                if (signature) {
                  parameters = this.extractParameters(signature, typeChecker);
                  returnType = typeChecker.typeToString(signature.getReturnType());
                }
              }
            }

            results.push({
              name: declaration.name.text,
              type: kind,
              valueType: type ? typeChecker.typeToString(type) : 'any',
              parameters,
              returnType,
              references: this.findReferences(declaration, sourceFile, typeChecker),
            });
          }
        });
      }

      // Class declarations
      else if (ts.isClassDeclaration(node) && node.name) {
        results.push({
          name: node.name.text,
          type: 'class',
          references: this.findReferences(node, sourceFile, typeChecker),
        });
      }

      // Interface declarations.
      else if (ts.isInterfaceDeclaration(node)) {
        results.push({
          name: node.name.text,
          type: 'interface',
          references: this.findReferences(node, sourceFile, typeChecker),
        });
      }

      ts.forEachChild(node, visit);
    };

    visit(sourceFile);
    return results;
  }

  /**
   * Extract parameter information from a signature.
   */
  private extractParameters(
    signature: ts.Signature | undefined,
    typeChecker: ts.TypeChecker,
  ): Array<{ name: string; type: string }> {
    if (!signature) return [];

    return signature.parameters.map((param) => ({
      name: param.getName(),
      type: typeChecker.typeToString(typeChecker.getTypeOfSymbolAtLocation(param, param.valueDeclaration!)),
    }));
  }

  /**
   * Find all references to variables used in a node.
   */
  private findReferences(node: ts.Node, sourceFile: ts.SourceFile, typeChecker: ts.TypeChecker): string[] {
    const references = new Set<string>();
    const localSymbols = new Set<string>();

    // First, collect local symbols (parameters, local variables).
    const collectLocalSymbols = (n: ts.Node) => {
      if (ts.isFunctionDeclaration(n) || ts.isArrowFunction(n) || ts.isFunctionExpression(n)) {
        n.parameters.forEach((param) => {
          if (ts.isIdentifier(param.name)) {
            localSymbols.add(param.name.text);
          }
        });
      }

      if (ts.isVariableDeclaration(n) && ts.isIdentifier(n.name)) {
        localSymbols.add(n.name.text);
      }

      ts.forEachChild(n, collectLocalSymbols);
    };

    collectLocalSymbols(node);

    // Then find all identifier references.
    const findRefs = (n: ts.Node) => {
      if (ts.isIdentifier(n)) {
        const symbol = typeChecker.getSymbolAtLocation(n);
        if (symbol && !localSymbols.has(n.text)) {
          // Check if it's a reference (not a declaration).
          const parent = n.parent;
          const isDeclaration =
            (ts.isVariableDeclaration(parent) && parent.name === n) ||
            (ts.isFunctionDeclaration(parent) && parent.name === n) ||
            (ts.isParameter(parent) && parent.name === n);

          if (!isDeclaration && !this.isBuiltIn(n.text)) {
            references.add(n.text);
          }
        }
      }
      ts.forEachChild(n, findRefs);
    };

    findRefs(node);
    return Array.from(references);
  }

  /**
   * Check if a name is a built-in global.
   */
  protected isBuiltIn(name: string): boolean {
    const builtIns = new Set([
      'console',
      'Math',
      'JSON',
      'Object',
      'Array',
      'String',
      'Number',
      'Promise',
      'Map',
      'Set',
      'Date',
      'RegExp',
      'Error',
      'parseInt',
      'parseFloat',
      'isNaN',
      'isFinite',
      'window',
      'document',
      'global',
      'process',
    ]);

    return builtIns.has(name);
  }

  /**
   * Find all identifier references in a source file.
   */
  protected findAllReferences(sourceFile: ts.SourceFile, _typeChecker: ts.TypeChecker): string[] {
    const references = new Set<string>();

    const visit = (node: ts.Node) => {
      if (ts.isIdentifier(node)) {
        // Skip if it's a declaration.
        const parent = node.parent;
        const isDeclaration =
          (ts.isVariableDeclaration(parent) && parent.name === node) ||
          (ts.isFunctionDeclaration(parent) && parent.name === node) ||
          (ts.isParameter(parent) && parent.name === node);

        if (!isDeclaration && !this.isBuiltIn(node.text)) {
          references.add(node.text);
        }
      }
      ts.forEachChild(node, visit);
    };

    visit(sourceFile);
    return Array.from(references);
  }
}

/**
 * Notebook-specific parser with dependency analysis.
 */
export class NotebookVirtualParser extends VirtualTypeScriptParser {
  /**
   * Analyze notebook cells with full type checking.
   */
  analyzeNotebook(cells: Array<{ id: string; code: string }>) {
    // Create cumulative environment where each cell can see previous cells
    const cumulativeCode: string[] = [];
    const cellAnalysis: Map<
      string,
      {
        exports: ParsedExpression[];
        imports: string[];
        errors: ts.Diagnostic[];
      }
    > = new Map();

    cells.forEach((cell) => {
      // Create files for all cells up to current.
      const files: VirtualFile[] = [];

      // Add previous cells as context.
      if (cumulativeCode.length > 0) {
        files.push({
          fileName: '/context.ts',
          content: cumulativeCode.join('\n'),
        });
      }

      // Add current cell.
      files.push({
        fileName: `/cell_${cell.id}.ts`,
        content: cell.code,
      });

      // Create environment.
      const fsMap = new Map<string, string>();
      files.forEach((file) => fsMap.set(file.fileName, file.content));

      // Add minimal TypeScript lib content.
      fsMap.set(
        '/lib.d.ts',
        trim`
          interface Array<T> { length: number; [n: number]: T; }
          interface Boolean {}
          interface Function {}
          interface IArguments {}
          interface Number {}
          interface Object {}
          interface RegExp {}
          interface String { length: number; }
          interface CallableFunction extends Function {}
          interface NewableFunction extends Function {}
          declare var console: { log(...args: any[]): void };
        `,
      );

      const system = createSystem(fsMap);
      const env = createVirtualTypeScriptEnvironment(
        system,
        [...files.map((f) => f.fileName), '/lib.d.ts'],
        ts,
        this.compilerOptions,
      );

      // Get diagnostics (errors).
      const diagnostics = env.languageService.getSemanticDiagnostics(`/cell_${cell.id}.ts`);

      // Analyze current cell.
      const sourceFile = env.getSourceFile(`/cell_${cell.id}.ts`);
      const typeChecker = env.languageService.getProgram()?.getTypeChecker();

      if (sourceFile && typeChecker) {
        const exports = this.analyzeSourceFile(sourceFile, typeChecker);

        // Find all references in the current cell.
        const allRefs = new Set<string>();
        exports.forEach((exp) => {
          exp.references?.forEach((ref) => allRefs.add(ref));
        });

        // Also check for references not in exports (like console.log(y)).
        const additionalRefs = this.findAllReferences(sourceFile, typeChecker);
        additionalRefs.forEach((ref) => allRefs.add(ref));

        // Determine which references are imports from previous cells.
        const previousExports = new Set<string>();
        for (const [_prevCellId, prevAnalysis] of cellAnalysis) {
          prevAnalysis.exports.forEach((exp) => {
            if (exp.name) previousExports.add(exp.name);
          });
        }

        const imports = Array.from(allRefs).filter((ref) => previousExports.has(ref));

        cellAnalysis.set(cell.id, {
          exports,
          imports,
          errors: diagnostics,
        });
      }

      // Add current cell code to cumulative.
      cumulativeCode.push(cell.code);
    });

    return cellAnalysis;
  }
}
