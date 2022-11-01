import { relative } from 'path';
import * as ts from 'typescript';

type PluginOptions = {

}

const f = ts.factory;

/**
 * TypeScript transformer that augments every log function with metadata.
 * 
 * Executed during the package build process.
 */
export const before = (pluginOptions: PluginOptions, program: ts.Program): ts.CustomTransformerFactory => context => {
  return {
    transformSourceFile: sourceFile => {
      let enabled = false;

      const visitor = (node: ts.Node): ts.Node => {

        if (isLoggerImportDeclarationWithLog(node, context)) {
          enabled = true;
        }

        if (enabled && ts.isCallExpression(node) && isLogMethod(node.expression)) {
          const args = [...node.arguments];
          if (args.length === 1) {
            // Pass empty context.
            args.push(f.createObjectLiteralExpression())
          }
          if (args.length === 2) {
            args.push(getLogMetadata(sourceFile, node, process.cwd()))
          }

          return f.updateCallExpression(node, node.expression, node.typeArguments, args);
        }

        return ts.visitEachChild(node, visitor, context);
      };

      return ts.visitNode(sourceFile, visitor);
    },
    transformBundle: bundle => bundle,
  };
}

/**
 * `import * from '@dxos/log'`
 */
const isLoggerImportDeclaration = (node: ts.Node): node is ts.ImportDeclaration =>
  ts.isImportDeclaration(node) &&
  ts.isStringLiteral(node.moduleSpecifier) &&
  node.moduleSpecifier.text === '@dxos/log'

/**
 * `import { log, * } from '@dxos/log'`
 */
const isLoggerImportDeclarationWithLog = (node: ts.Node, context: ts.TransformationContext): node is ts.ImportDeclaration => {
  let hasLog = false;
  if (isLoggerImportDeclaration(node)) {
    const findLog = (node: ts.Node): ts.Node => {
      if (ts.isImportSpecifier(node) && node.name.text === 'log') {
        hasLog = true;
      }
      return ts.visitEachChild(node, findLog, context);
    }

    ts.visitNode(node, findLog)
  }
  return hasLog
}

/**
 * `log`
 * `log.*`
 */
const isLogMethod = (node: ts.Node): boolean => {
  if (ts.isIdentifier(node)) {
    return node.text === 'log'
  }
  if (ts.isPropertyAccessExpression(node)) {
    return ts.isIdentifier(node.expression) && node.expression.text === 'log';
  }
  return false;
}

const getLogMetadata = (sourceFile: ts.SourceFile, call: ts.CallExpression, root: string): ts.Expression =>
  f.createObjectLiteralExpression([
    f.createPropertyAssignment('file', f.createStringLiteral(relative(root, sourceFile.fileName))),
    f.createPropertyAssignment('line', f.createNumericLiteral(sourceFile.getLineAndCharacterOfPosition(call.getStart(sourceFile)).line + 1)),
    // TODO(dmaretskyi): Ownership scope & bugcheck.
  ], false)