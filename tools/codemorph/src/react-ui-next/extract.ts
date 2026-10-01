//
// Copyright 2026 DXOS.org
//

import ts from '@typescript/typescript6';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';

/** The names an entry exports and the parts of each composite, as read from its source. */
export type EntryExports = {
  values: string[];
  types: string[];
  parts: Record<string, string[]>;
};

const parse = (file: string) =>
  ts.createSourceFile(file, readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);

const sourceFiles = (dir: string): string[] =>
  readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) {
      return sourceFiles(path);
    }
    return /\.tsx?$/.test(name) && !/\.(stories|test)\.tsx?$/.test(name) ? [path] : [];
  });

const isExported = (node: ts.Node) =>
  ts.canHaveModifiers(node) && (ts.getModifiers(node) ?? []).some((mod) => mod.kind === ts.SyntaxKind.ExportKeyword);

/** Every exported `const X = { Part: … }` composite in `dir`, by name. */
const readParts = (dir: string): Record<string, string[]> => {
  const parts: Record<string, string[]> = {};
  for (const file of sourceFiles(dir)) {
    parse(file).forEachChild((node) => {
      if (!ts.isVariableStatement(node) || !isExported(node)) {
        return;
      }
      for (const decl of node.declarationList.declarations) {
        if (
          ts.isIdentifier(decl.name) &&
          /^[A-Z]/.test(decl.name.text) &&
          decl.initializer &&
          ts.isObjectLiteralExpression(decl.initializer)
        ) {
          const names = decl.initializer.properties.flatMap((prop) =>
            prop.name && ts.isIdentifier(prop.name) ? [prop.name.text] : [],
          );
          if (names.length > 0) {
            parts[decl.name.text] = names;
          }
        }
      }
    });
  }
  return parts;
};

/** The members of `@dxos/react-ui/next`'s `Next` namespace and the parts of each composite. */
export const readReactUiNext = (repoRoot: string): EntryExports => {
  const values: string[] = [];
  const types: string[] = [];
  parse(join(repoRoot, 'packages/ui/react-ui/src/next/Next.tsx')).forEachChild((node) => {
    if (!ts.isModuleDeclaration(node) || !node.body || !ts.isModuleBlock(node.body)) {
      return;
    }
    for (const statement of node.body.statements) {
      if (ts.isVariableStatement(statement)) {
        for (const decl of statement.declarationList.declarations) {
          if (ts.isIdentifier(decl.name)) {
            values.push(decl.name.text);
          }
        }
      } else if (ts.isTypeAliasDeclaration(statement)) {
        types.push(statement.name.text);
      }
    }
  });
  const parts = readParts(join(repoRoot, 'packages/ui/react-ui/src/next/components'));
  return {
    values,
    types,
    parts: Object.fromEntries(values.filter((name) => parts[name]).map((name) => [name, parts[name]])),
  };
};

/** The named exports of a sibling package's `src/next/index.ts`, following its `export *` chain. */
export const readSiblingNext = (repoRoot: string, pkg: string): EntryExports => {
  const dir = join(repoRoot, 'packages/ui', pkg, 'src/next');
  const values = new Set<string>();
  const types = new Set<string>();
  const visit = (file: string) => {
    parse(file).forEachChild((node) => {
      if (ts.isVariableStatement(node) && isExported(node)) {
        for (const decl of node.declarationList.declarations) {
          if (ts.isIdentifier(decl.name)) {
            values.add(decl.name.text);
          }
        }
      } else if ((ts.isTypeAliasDeclaration(node) || ts.isInterfaceDeclaration(node)) && isExported(node)) {
        types.add(node.name.text);
      } else if (ts.isExportDeclaration(node)) {
        if (node.exportClause && ts.isNamedExports(node.exportClause)) {
          for (const element of node.exportClause.elements) {
            (node.isTypeOnly || element.isTypeOnly ? types : values).add(element.name.text);
          }
        } else if (!node.exportClause && node.moduleSpecifier && ts.isStringLiteral(node.moduleSpecifier)) {
          visit(join(dirname(file), node.moduleSpecifier.text));
        }
      }
    });
  };
  visit(join(dir, 'index.ts'));
  const parts = readParts(dir);
  return {
    values: [...values].sort(),
    types: [...types].sort(),
    parts: Object.fromEntries(Object.entries(parts).filter(([name]) => values.has(name))),
  };
};
