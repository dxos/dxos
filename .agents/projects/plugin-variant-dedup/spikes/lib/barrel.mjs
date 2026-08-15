// Parses a capabilities barrel file (index.ts / node.ts / workerd.ts) into a map of
// exported-name -> spec (maker callee + args), resolving one level of re-export indirection
// (`export * from './x'`, `export { X } from './x'`) since plugin-space's barrel uses both.

import path from 'node:path';

import {
  ts,
  parseFile,
  calleeText,
  nodeText,
  topLevelExportConsts,
  topLevelExportDeclarations,
  resolveRelativeModule,
  statementTextWithLeadingComments,
} from './ts-util.mjs';

/**
 * @returns {Map<string, {name, calleeText, argsText, kind, sourceFile, exportText, via}>}
 */
export const parseBarrel = (filePath) => {
  const members = new Map();
  if (!filePath) return members;
  const sourceFile = parseFile(filePath);
  if (!sourceFile) return members;

  for (const { name, initializer, statement } of topLevelExportConsts(sourceFile)) {
    members.set(name, describeInitializer(sourceFile, name, initializer, statement, filePath, 'direct'));
  }

  for (const exp of topLevelExportDeclarations(sourceFile)) {
    if (exp.isTypeOnly) continue;
    if (exp.kind === 'star') {
      const target = resolveRelativeModule(path.dirname(filePath), exp.moduleSpecifier);
      if (!target) {
        members.set(`*from:${exp.moduleSpecifier}`, {
          name: `*from:${exp.moduleSpecifier}`,
          kind: 'unresolved-star',
          sourceFile: filePath,
        });
        continue;
      }
      const targetMembers = parseBarrel(target);
      for (const [name, spec] of targetMembers) {
        members.set(name, { ...spec, via: `star:${exp.moduleSpecifier}` });
      }
    } else if (exp.kind === 'named') {
      if (exp.moduleSpecifier) {
        const target = resolveRelativeModule(path.dirname(filePath), exp.moduleSpecifier);
        const targetMembers = target ? parseBarrel(target) : new Map();
        const found = targetMembers.get(exp.localName);
        if (found) {
          members.set(exp.exportedName, { ...found, via: `named:${exp.moduleSpecifier}` });
        } else {
          members.set(exp.exportedName, {
            name: exp.exportedName,
            kind: 'unresolved-named-reexport',
            calleeText: null,
            argsText: null,
            sourceFile: filePath,
            via: `named:${exp.moduleSpecifier}`,
          });
        }
      }
      // local named re-export (`export { X }` without a module specifier) — X should already be
      // a top-level const in this same file and thus already captured above.
    }
  }

  return members;
};

const describeInitializer = (sourceFile, name, initializer, statement, filePath, via) => {
  if (ts.isCallExpression(initializer)) {
    return {
      name,
      kind: 'maker-call',
      calleeText: calleeText(sourceFile, initializer.expression),
      argsText: initializer.arguments.map((a) => nodeText(sourceFile, a)).join(', '),
      sourceFile: filePath,
      statementText: statementTextWithLeadingComments(sourceFile, statement),
      via,
    };
  }
  return {
    name,
    kind: 'non-call-initializer',
    calleeText: null,
    argsText: nodeText(sourceFile, initializer),
    sourceFile: filePath,
    statementText: statementTextWithLeadingComments(sourceFile, statement),
    via,
  };
};
