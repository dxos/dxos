//
// Copyright 2026 DXOS.org
//

import { type EsParserConfig, type TsParserConfig, parseSync } from '@swc/core';
import path from 'node:path';

const TS_EXTENSIONS = new Set(['.ts', '.tsx', '.mts', '.cts']);

const parseOptionsFor = (filePath: string): TsParserConfig | EsParserConfig => {
  const extension = path.extname(filePath).toLowerCase();
  if (TS_EXTENSIONS.has(extension)) {
    return { syntax: 'typescript', tsx: extension === '.tsx', decorators: true };
  }
  return { syntax: 'ecmascript', jsx: extension === '.jsx' };
};

// The SWC AST is walked structurally; narrow untyped nodes at this boundary.
const asRecord = (value: unknown): Record<string, unknown> | null =>
  typeof value === 'object' && value !== null ? (value as Record<string, unknown>) : null;

const stringLiteralValue = (value: unknown): string | null => {
  const record = asRecord(value);
  if (record && record.type === 'StringLiteral' && typeof record.value === 'string') {
    return record.value;
  }
  return null;
};

const isRequireCallee = (callee: Record<string, unknown> | null): boolean =>
  callee?.type === 'Identifier' && callee.value === 'require';

const isTypeOnlySpecifier = (specifier: unknown): boolean => asRecord(specifier)?.isTypeOnly === true;

/**
 * A declaration carries no runtime edge when it is an `import type` / `export type`, or when
 * every named specifier is individually `type`-marked (`import { type A } from 'x'`) and thus
 * fully elided at compile time. Side-effect imports (`import 'x'`, empty specifiers) are kept.
 */
const isEntirelyTypeOnly = (node: Record<string, unknown>): boolean => {
  if (node.typeOnly === true) {
    return true;
  }
  const specifiers = node.specifiers;
  return Array.isArray(specifiers) && specifiers.length > 0 && specifiers.every(isTypeOnlySpecifier);
};

const collectSpecifiers = (value: unknown, out: Set<string>): void => {
  if (Array.isArray(value)) {
    for (const child of value) {
      collectSpecifiers(child, out);
    }
    return;
  }

  const node = asRecord(value);
  if (!node) {
    return;
  }

  switch (node.type) {
    // Static import / re-export edges. Type-only declarations carry no runtime edge, and none
    // of these nodes' children hold executable code, so stop descending here.
    case 'ImportDeclaration':
    case 'ExportAllDeclaration':
    case 'ExportNamedDeclaration': {
      if (isEntirelyTypeOnly(node)) {
        return;
      }
      const source = stringLiteralValue(node.source);
      if (source) {
        out.add(source);
      }
      return;
    }
    // Dynamic `import(...)` and CommonJS `require(...)`. Keep descending into arguments
    // so nested calls are not missed.
    case 'CallExpression': {
      const callee = asRecord(node.callee);
      if (callee?.type === 'Import' || isRequireCallee(callee)) {
        const args = node.arguments;
        const firstArg = Array.isArray(args) ? asRecord(args[0]) : null;
        const source = stringLiteralValue(firstArg?.expression);
        if (source) {
          out.add(source);
        }
      }
      break;
    }
    default:
      break;
  }

  for (const key in node) {
    if (key === 'type' || key === 'span') {
      continue;
    }
    collectSpecifiers(node[key], out);
  }
};

/**
 * Extract runtime module specifiers from a TypeScript/JavaScript source file using
 * the SWC parser. Type-only imports/exports are skipped since they carry no runtime edge.
 */
export const parseImportSpecifiers = (source: string, filePath: string): string[] => {
  let ast: ReturnType<typeof parseSync>;
  try {
    ast = parseSync(source, parseOptionsFor(filePath));
  } catch {
    return [];
  }
  const specifiers = new Set<string>();
  collectSpecifiers(ast.body, specifiers);
  return [...specifiers];
};
