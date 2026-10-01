//
// Copyright 2026 DXOS.org
//

import ts from '@typescript/typescript6';

import { type CodeFile } from '../code-file.ts';
import { type Transform } from './transform.ts';

/** `useThemeContext()` fields with a Next hook of their own; `tx` has none, since it goes with the current components. */
const THEME_HOOKS: Record<string, string> = {
  themeMode: 'useThemeMode',
  platform: 'usePlatform',
  hasIosKeyboard: 'useIosKeyboard',
};

/** Whether `call` is `useThemeContext()` imported from the current react-ui. */
const isThemeContext = (file: CodeFile, call: ts.Node): call is ts.CallExpression => {
  if (!ts.isCallExpression(call) || !ts.isIdentifier(call.expression) || call.arguments.length > 0) {
    return false;
  }
  const binding = file.bindings.get(call.expression.text);
  return binding?.pkg === 'react-ui' && binding.form === 'current' && binding.imported === 'useThemeContext';
};

const rewrite = (file: CodeFile, statement: ts.VariableStatement, decl: ts.VariableDeclaration) => {
  if (!ts.isObjectBindingPattern(decl.name) || !decl.initializer || statement.declarationList.declarations.length > 1) {
    file.report(decl, 'useThemeContext() not destructured in its own statement; read the Next hooks by hand');
    return;
  }
  const keyword = statement.declarationList.flags & ts.NodeFlags.Const ? 'const' : 'let';
  const mapped: string[] = [];
  const kept: string[] = [];
  for (const element of decl.name.elements) {
    const field = (element.propertyName ?? element.name).getText(file.sourceFile);
    const hook = THEME_HOOKS[field];
    if (hook && !element.dotDotDotToken && !element.initializer && ts.isIdentifier(element.name)) {
      mapped.push(`${keyword} ${element.name.text} = ${file.nameFor('react-ui', 'next', [hook])}();`);
      file.count(`useThemeContext().${field} → Next.${hook}()`);
    } else {
      kept.push(element.getText(file.sourceFile));
      file.report(element, `useThemeContext().${field} has no Next hook (tx goes with the current components)`);
    }
  }
  if (mapped.length === 0) {
    return;
  }
  const { line } = file.sourceFile.getLineAndCharacterOfPosition(statement.getStart(file.sourceFile));
  const indent = file.text.slice(file.sourceFile.getPositionOfLineAndCharacter(line, 0)).match(/^\s*/)?.[0] ?? '';
  const call = decl.initializer.getText(file.sourceFile);
  const lines = kept.length > 0 ? [...mapped, `${keyword} { ${kept.join(', ')} } = ${call};`] : mapped;
  file.replace(statement, lines.join(`\n${indent}`));
  if (kept.length === 0 && ts.isCallExpression(decl.initializer) && ts.isIdentifier(decl.initializer.expression)) {
    file.release(decl.initializer.expression.text);
  }
};

export const theme: Transform = {
  name: 'theme',
  description: 'useThemeContext() fields → Next.useThemeMode / usePlatform / useIosKeyboard; tx is reported per call.',
  applies: (text) => text.includes('useThemeContext'),
  run: (file) => {
    const visit = (node: ts.Node) => {
      if (isThemeContext(file, node)) {
        const decl = node.parent;
        const statement = decl.parent?.parent;
        if (ts.isVariableDeclaration(decl) && statement && ts.isVariableStatement(statement)) {
          rewrite(file, statement, decl);
        } else {
          file.report(node, 'useThemeContext() not destructured; read the Next hooks by hand');
        }
        return;
      }
      ts.forEachChild(node, visit);
    };
    visit(file.sourceFile);
  },
};

/** Imports whose uses this transform reports one by one. */
export const THEME_NAMES = new Set(['useThemeContext']);
