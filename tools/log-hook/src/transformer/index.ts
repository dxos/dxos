//
// Copyright 2022 DXOS.org
//

import { relative } from 'path';
import * as ts from 'typescript';

import { BUGCHECK_STRING } from '../hook/hook';

type PluginOptions = {};

const f = ts.factory;

// Logging instance.
const LOG_FN = 'log';

/**
 * TypeScript transformer that augments every log function with metadata.
 * Executed during the package build process.
 */
export const before = (pluginOptions: PluginOptions, program: ts.Program): ts.CustomTransformerFactory => {
  return (context) => {
    return {
      transformSourceFile: (sourceFile) => {
        // console.log('-', sourceFile.fileName);
        let enabled = false;

        const visitor = (node: ts.Node): ts.Node => {
          if (isLoggerImportDeclarationWithLog(node, context)) {
            enabled = true;
          }

          if (enabled && ts.isCallExpression(node) && isLogMethod(node.expression)) {
            const args = [...node.arguments];
            if (args.length <= 1) {
              // Pass empty context.
              args.push(f.createObjectLiteralExpression());
            }
            if (args.length === 2) {
              args.push(getLogMetadata(sourceFile, node, process.cwd()));
            }

            return f.updateCallExpression(node, node.expression, node.typeArguments, args);
          }

          return ts.visitEachChild(node, visitor, context);
        };

        return ts.visitNode(sourceFile, visitor);
      },

      transformBundle: (bundle) => bundle
    };
  };
};

/**
 * `import * from '@dxos/log'`
 */
const isLoggerImportDeclaration = (node: ts.Node): node is ts.ImportDeclaration => {
  return (
    ts.isImportDeclaration(node) &&
    ts.isStringLiteral(node.moduleSpecifier) &&
    node.moduleSpecifier.text === '@dxos/log'
  );
};

/**
 * `import { log, * } from '@dxos/log'`
 */
const isLoggerImportDeclarationWithLog = (
  node: ts.Node,
  context: ts.TransformationContext
): node is ts.ImportDeclaration => {
  let hasLog = false;
  if (isLoggerImportDeclaration(node)) {
    const findLog = (node: ts.Node): ts.Node => {
      if (ts.isImportSpecifier(node) && node.name.text === LOG_FN) {
        hasLog = true;
      }
      return ts.visitEachChild(node, findLog, context);
    };

    ts.visitNode(node, findLog);
  }

  return hasLog;
};

/**
 * `log`
 * `log.*`
 */
// TODO(burdon): Test global call (don't mistake method on user class).
const isLogMethod = (node: ts.Node): boolean => {
  if (ts.isIdentifier(node)) {
    return node.text === LOG_FN;
  }
  if (ts.isPropertyAccessExpression(node)) {
    return ts.isIdentifier(node.expression) && node.expression.text === LOG_FN;
  }

  return false;
};

const getLogMetadata = (sourceFile: ts.SourceFile, call: ts.CallExpression, root: string): ts.Expression => {
  return f.createObjectLiteralExpression(
    [
      f.createPropertyAssignment('file', f.createStringLiteral(relative(root, sourceFile.fileName))),
      f.createPropertyAssignment(
        'line',
        f.createNumericLiteral(sourceFile.getLineAndCharacterOfPosition(call.getStart(sourceFile)).line + 1)
      ),
      f.createPropertyAssignment('scope', f.createThis()),
      f.createPropertyAssignment('bugcheck', f.createStringLiteral(BUGCHECK_STRING))
    ],
    false
  );
};
