//
// Copyright 2026 DXOS.org
//

import ts from '@typescript/typescript6';

import { type CodeFile } from '../code-file.ts';
import { type Transform } from './transform.ts';

/**
 * Text-emphasis class renames (DESIGN.md "Text emphasis", step 2), current class → new class.
 * Empty until the new names are decided; the transform is a no-op while it is.
 */
export const TEXT_EMPHASIS_RENAMES: Record<string, string> = {};

/** Splits a utility into its variant prefix (`hover:`, `md:`, `!`), core and opacity suffix (`/50`). */
const TOKEN = /^((?:[^:\s[]*(?:\[[^\]]*\])?[^:\s[]*:)*!?)([^/\s]+)(\/\S+)?$/;

/** Renames the emphasis classes in one class string, or returns undefined when none matched. */
export const renameClasses = (
  value: string,
  table: Record<string, string> = TEXT_EMPHASIS_RENAMES,
): string | undefined => {
  let changed = false;
  const result = value.replace(/\S+/g, (token) => {
    const match = token.match(TOKEN);
    const renamed = match ? table[match[2]] : undefined;
    if (!match || !renamed) {
      return token;
    }
    changed = true;
    return `${match[1]}${renamed}${match[3] ?? ''}`;
  });
  return changed ? result : undefined;
};

const isModuleSpecifier = (node: ts.Node) =>
  ts.isImportDeclaration(node.parent) ||
  ts.isExportDeclaration(node.parent) ||
  ts.isExternalModuleReference(node.parent);

/** Builds the transform over a rename table, so tests can exercise it before the real names exist. */
export const createEmphasisTransform = (table: Record<string, string>): Transform => ({
  name: 'emphasis',
  description: 'Text-emphasis class rename (deferred: the rename table is empty).',
  applies: () => Object.keys(table).length > 0,
  run: (file: CodeFile) => {
    const visit = (node: ts.Node) => {
      if ((ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) && !isModuleSpecifier(node)) {
        const renamed = renameClasses(node.text, table);
        if (renamed !== undefined) {
          const delimiter = node.getText(file.sourceFile)[0];
          file.replace(node, `${delimiter}${renamed}${delimiter}`);
          file.count('text-emphasis class renamed');
        }
      }
      ts.forEachChild(node, visit);
    };
    visit(file.sourceFile);
  },
});

export const emphasis: Transform = createEmphasisTransform(TEXT_EMPHASIS_RENAMES);
