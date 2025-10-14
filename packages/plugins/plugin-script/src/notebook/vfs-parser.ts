//
// Copyright 2025 DXOS.org
//

import { createSystem, createVirtualTypeScriptEnvironment } from '@typescript/vfs';
import ts from 'typescript';

import { invariant } from '@dxos/invariant';
import { trim } from '@dxos/util';

export type ParsedExpression = {
  name?: string;
  type?: 'function' | 'variable' | 'class' | 'interface';
  value?: any;
  valueType?: string;
  parameters?: Array<{ name: string; type: string }>;
  returnType?: string;
  references?: string[];
};

export type VirtualFile = {
  filename: string;
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
    forceConsistentCasingInfilenames: true,
    jsx: ts.JsxEmit.React,
    noLib: true, // Don't automatically include default lib files.
  };

  /**
   * Parse a single expression or statement.
   */
  parseExpression(input: string): ParsedExpression {
    invariant(input.trim() !== '', 'input must not be empty');
    const files: VirtualFile[] = [{ filename: '/temp.ts', content: input }];
    const analysis = this.analyzeFiles(files);

    // If no declarations found, check for standalone expression references.
    if (analysis.length === 0) {
      const sourcefilename = '/temp.ts';
      const env = this.createEnvironment([{ filename: sourcefilename, content: input }, ...systemFiles]);
      const sourceFile = env.getSourceFile(sourcefilename);
      const typeChecker = env.languageService.getProgram()?.getTypeChecker();

      if (sourceFile && typeChecker) {
        // Check for assignment expressions.
        const assignmentInfo = this.findAssignmentExpression(sourceFile, typeChecker);
        if (assignmentInfo) {
          return assignmentInfo;
        }

        const references = this.findAllReferences(sourceFile, typeChecker);
        return { references };
      }
    }

    return analysis[0];
  }

  /**
   * Analyze multiple files with full type information.
   */
  analyzeFiles(files: VirtualFile[]): ParsedExpression[] {
    const env = this.createEnvironment([...files, ...systemFiles]);
    const results: ParsedExpression[] = [];
    const typeChecker = env.languageService.getProgram()?.getTypeChecker();

    // Analyze each file.
    files.forEach((file) => {
      const sourceFile = env.getSourceFile(file.filename);
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
            let value: any;

            // Get the type string
            const typeString = type ? typeChecker.typeToString(type) : 'any';

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
              } else {
                // Extract literal values
                if (ts.isNumericLiteral(declaration.initializer)) {
                  value = Number(declaration.initializer.text);
                } else if (ts.isStringLiteral(declaration.initializer)) {
                  value = declaration.initializer.text;
                }
              }
            }

            // Find references in the initializer only
            const refs = declaration.initializer
              ? this.findReferences(declaration.initializer, sourceFile, typeChecker)
              : [];

            results.push({
              name: declaration.name.text,
              type: kind,
              valueType: typeString,
              value,
              parameters,
              returnType,
              references: refs,
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
  private findReferences(node: ts.Node, _sourceFile: ts.SourceFile, _typeChecker: ts.TypeChecker): string[] {
    const references = new Set<string>();
    const localSymbols = new Set<string>();

    // First, collect local symbols (parameters, local variables).
    const collectLocalSymbols = (node: ts.Node) => {
      if (ts.isFunctionDeclaration(node) || ts.isArrowFunction(node) || ts.isFunctionExpression(node)) {
        node.parameters.forEach((param) => {
          if (ts.isIdentifier(param.name)) {
            localSymbols.add(param.name.text);
          }
        });
      }

      if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name)) {
        localSymbols.add(node.name.text);
      }

      ts.forEachChild(node, collectLocalSymbols);
    };

    collectLocalSymbols(node);

    // Then find all identifier references.
    const findRefs = (node: ts.Node) => {
      if (ts.isIdentifier(node)) {
        // Skip if it's a local symbol
        if (!localSymbols.has(node.text)) {
          // Check if it's a reference (not a declaration).
          const parent = node.parent;
          const isDeclaration =
            (ts.isVariableDeclaration(parent) && parent.name === node) ||
            (ts.isFunctionDeclaration(parent) && parent.name === node) ||
            (ts.isParameter(parent) && parent.name === node);

          if (!isDeclaration && !this.isBuiltIn(node.text)) {
            references.add(node.text);
          }
        }
      }
      ts.forEachChild(node, findRefs);
    };

    findRefs(node);
    return Array.from(references);
  }

  /**
   * Check if a name is a built-in global.
   */
  protected isBuiltIn(name: string): boolean {
    return builtIns.has(name);
  }

  /**
   * Find assignment expressions in a source file.
   */
  private findAssignmentExpression(sourceFile: ts.SourceFile, typeChecker: ts.TypeChecker): ParsedExpression | null {
    let result: ParsedExpression | null = null;

    const visit = (node: ts.Node) => {
      if (ts.isExpressionStatement(node) && ts.isBinaryExpression(node.expression)) {
        const expr = node.expression;
        if (expr.operatorToken.kind === ts.SyntaxKind.EqualsToken && ts.isIdentifier(expr.left)) {
          const type = typeChecker.getTypeAtLocation(expr.right);
          const typeString = typeChecker.typeToString(type);

          // Get the literal value if it's a literal
          let value: any;
          if (ts.isNumericLiteral(expr.right)) {
            value = Number(expr.right.text);
          } else if (ts.isStringLiteral(expr.right)) {
            value = expr.right.text;
          }

          // Find references in the right-hand side
          const references = this.findReferences(expr.right, sourceFile, typeChecker);

          result = {
            name: expr.left.text,
            type: 'variable',
            valueType: typeString,
            value,
            references,
          };
        }
      }
      if (!result) {
        ts.forEachChild(node, visit);
      }
    };

    visit(sourceFile);
    return result;
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

        // Skip if it's the left-hand side of an assignment.
        const isAssignmentTarget =
          ts.isBinaryExpression(parent) &&
          parent.operatorToken.kind === ts.SyntaxKind.EqualsToken &&
          parent.left === node;

        if (!isDeclaration && !isAssignmentTarget && !this.isBuiltIn(node.text)) {
          references.add(node.text);
        }
      }
      ts.forEachChild(node, visit);
    };

    visit(sourceFile);
    return Array.from(references);
  }

  protected createEnvironment(files: VirtualFile[]) {
    const fileMap = new Map<string, string>();
    files.forEach(({ filename, content }) => {
      fileMap.set(filename, content);
    });

    const system = createSystem(fileMap);
    return createVirtualTypeScriptEnvironment(
      system,
      files.map(({ filename }) => filename),
      ts,
      this.compilerOptions,
    );
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
          filename: '/context.ts',
          content: cumulativeCode.join('\n'),
        });
      }

      // Add current cell.
      const filename = `/cell/${cell.id}.ts`;
      files.push({
        filename,
        content: cell.code,
      });

      // Create environment.
      const env = this.createEnvironment([...files, ...systemFiles]);

      // Get diagnostics (errors).
      const diagnostics = env.languageService.getSemanticDiagnostics(filename);

      // Analyze current cell.
      const sourceFile = env.getSourceFile(filename);
      const typeChecker = env.languageService.getProgram()?.getTypeChecker();

      if (sourceFile && typeChecker) {
        const exports = this.analyzeSourceFile(sourceFile, typeChecker);

        // Find all references in the current cell.
        const allRefs = new Set<string>();
        exports.forEach((exp) => {
          exp.references?.forEach((ref) => allRefs.add(ref));
        });

        // Also check for references not in exports (e.g., console.log(y)).
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

/**
 * Globals.
 */
const builtIns = new Set([
  // Types.
  'Array',
  'Date',
  'Error',
  'JSON',
  'Map',
  'Math',
  'Number',
  'Promise',
  'Object',
  'RegExp',
  'Set',
  'String',

  // Functions.
  'isFinite',
  'isNaN',
  'parseFloat',
  'parseInt',
]);

/**
 * Default system definitions.
 */
const systemFiles: VirtualFile[] = [
  {
    filename: '/lib.d.ts',
    content: trim`
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
  },
];
