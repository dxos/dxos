//
// Copyright 2026 DXOS.org
//

import path from 'node:path';

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
} from './ts-util';

export type BarrelMember = {
  name: string;
  /** `maker-call` members are module declarations; anything else is a helper/value export. */
  kind: 'maker-call' | 'non-call-initializer';
  /** Environments parsed from the maker call's `environments: [...]` literal; null means unannotated (browser-only). */
  environments: readonly string[] | null;
  /** File the declaration statement actually lives in (may differ from the barrel via re-exports). */
  sourceFile: string;
  statementText: string;
};

/**
 * Parses a canonical capabilities barrel into exported-name -> member, resolving one level of
 * `export * from` / `export { X } from` indirection (both occur in real plugin barrels).
 */
export const parseBarrel = (filePath: string): Map<string, BarrelMember> => {
  const members = new Map<string, BarrelMember>();
  const sourceFile = parseFile(filePath);
  if (!sourceFile) {
    return members;
  }

  for (const entry of topLevelExportConsts(sourceFile)) {
    members.set(entry.name, describeMember(sourceFile, entry, filePath));
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
  sourceFile: import('typescript').SourceFile,
  entry: ExportConst,
  filePath: string,
): BarrelMember => {
  const statementText = statementTextWithLeadingComments(sourceFile, entry.statement);
  if (!ts.isCallExpression(entry.initializer)) {
    return { name: entry.name, kind: 'non-call-initializer', environments: null, sourceFile: filePath, statementText };
  }
  return {
    name: entry.name,
    kind: 'maker-call',
    environments: readEnvironments(sourceFile, entry.initializer),
    sourceFile: filePath,
    statementText,
  };
};

/**
 * Reads the `environments: ['...']` literal from whichever argument of the maker call is an
 * object literal carrying it — covers maker options bags, `lazyModule`/`inlineModule` specs, and
 * the value-based helpers' options. A computed (non-literal) value is a hard error: the generator
 * is the only consumer and would silently mis-classify the module.
 */
const readEnvironments = (
  sourceFile: import('typescript').SourceFile,
  call: import('typescript').CallExpression,
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
