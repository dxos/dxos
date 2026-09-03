//
// Copyright 2026 DXOS.org
//

import path from 'node:path';

import { type MakerDefaults, makerDefaults } from './maker-defaults.ts';
import {
  type ExportConst,
  calleeText,
  nodeText,
  parseFile,
  resolveRelativeModule,
  statementTextWithLeadingComments,
  topLevelExportConsts,
  topLevelExportDeclarations,
  ts,
} from './ts-util.ts';

export type BarrelMember = {
  name: string;
  /** `maker-call` members are module declarations; anything else is a helper/value export. */
  kind: 'maker-call' | 'non-call-initializer';
  /**
   * Conditions this module is split out for: the call site's own `environments` literal, else the
   * default its maker family declares. Null means neither applies, and the module is treated as
   * isomorphic — every generated variant carries it.
   */
  environments: readonly string[] | null;
  /** File the declaration statement actually lives in (may differ from the barrel via re-exports). */
  sourceFile: string;
  statementText: string;
};

/**
 * Parses a canonical capabilities barrel into exported-name -> member, resolving one level of
 * `export * from` / `export { X } from` indirection (both occur in real plugin barrels).
 */
export const parseBarrel = (
  filePath: string,
  defaults: MakerDefaults = makerDefaults(filePath),
): Map<string, BarrelMember> => {
  const members = new Map<string, BarrelMember>();
  const sourceFile = parseFile(filePath);
  if (!sourceFile) {
    return members;
  }

  for (const entry of topLevelExportConsts(sourceFile)) {
    members.set(entry.name, describeMember(sourceFile, entry, filePath, defaults));
  }

  for (const exp of topLevelExportDeclarations(sourceFile)) {
    if (exp.kind === 'star') {
      if (!exp.moduleSpecifier) {
        continue;
      }
      const target = resolveRelativeModule(path.dirname(filePath), exp.moduleSpecifier);
      if (!target) {
        continue;
      }
      for (const [name, member] of parseBarrel(target)) {
        members.set(name, member);
      }
    } else if (!exp.isTypeOnly && exp.moduleSpecifier) {
      const target = resolveRelativeModule(path.dirname(filePath), exp.moduleSpecifier);
      if (!target) {
        continue;
      }
      const found = parseBarrel(target).get(exp.localName);
      if (found) {
        members.set(exp.exportedName, found);
      }
    }
  }

  return members;
};

const describeMember = (
  sourceFile: import('@typescript/typescript6').SourceFile,
  entry: ExportConst,
  filePath: string,
  defaults: MakerDefaults,
): BarrelMember => {
  const statementText = statementTextWithLeadingComments(sourceFile, entry.statement);
  if (!ts.isCallExpression(entry.initializer)) {
    return { name: entry.name, kind: 'non-call-initializer', environments: null, sourceFile: filePath, statementText };
  }
  return {
    name: entry.name,
    kind: 'maker-call',
    environments: resolveEnvironments(sourceFile, entry.initializer, defaults),
    sourceFile: filePath,
    statementText,
  };
};

/**
 * A module's conditions: its own `environments` literal if it declares one, else the default its
 * maker family declares. Only the call site can narrow or widen a family — that is the whole point
 * of the family default, so a genuine exception stays a one-line annotation at the exception.
 */
const resolveEnvironments = (
  sourceFile: import('@typescript/typescript6').SourceFile,
  call: import('@typescript/typescript6').CallExpression,
  defaults: MakerDefaults,
): readonly string[] | null => {
  const declared = readEnvironments(sourceFile, call);
  if (declared) {
    return declared;
  }
  const callee = call.expression;
  return ts.isPropertyAccessExpression(callee) && ts.isIdentifier(callee.expression)
    ? defaults.lookup(callee.expression.text, callee.name.text)
    : null;
};

/**
 * Reads the `environments: ['...']` literal from whichever argument of the maker call is an
 * object literal carrying it — covers maker options bags, `lazyModule`/`inlineModule` specs, and
 * the value-based helpers' options. A computed (non-literal) value is a hard error: the generator
 * is the only consumer and would silently mis-classify the module.
 */
const readEnvironments = (
  sourceFile: import('@typescript/typescript6').SourceFile,
  call: import('@typescript/typescript6').CallExpression,
): readonly string[] | null => {
  for (const arg of call.arguments) {
    if (!ts.isObjectLiteralExpression(arg)) {
      continue;
    }
    for (const prop of arg.properties) {
      if (!ts.isPropertyAssignment(prop) || !ts.isIdentifier(prop.name) || prop.name.text !== 'environments') {
        continue;
      }
      if (!ts.isArrayLiteralExpression(prop.initializer)) {
        throw new Error(
          `environments must be a literal array of string literals (${calleeText(sourceFile, call.expression)} at ${sourceFile.fileName})`,
        );
      }
      const values: string[] = [];
      for (const element of prop.initializer.elements) {
        if (!ts.isStringLiteralLike(element)) {
          throw new Error(
            `environments must be a literal array of string literals (${calleeText(sourceFile, call.expression)} at ${sourceFile.fileName}, saw ${nodeText(sourceFile, element)})`,
          );
        }
        values.push(element.text);
      }
      return values;
    }
  }
  return null;
};
