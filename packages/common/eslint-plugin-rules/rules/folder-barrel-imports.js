//
// Copyright 2026 DXOS.org
//

import path from 'node:path';

/**
 * ESLint rule that makes every folder private: a relative import that crosses into another folder goes through that
 * folder's barrel, the packlets rule applied at every depth.
 *
 * From a file in folder `F`:
 * - a file in `F` is fine;
 * - a direct child folder is entered only by its barrel (`./child/index.ts`), never a file inside it or below it;
 * - a sibling or cousin folder is entered only by the barrel of the first folder below the common ancestor
 *   (`../panels/index.ts`, not `../panels/ToolsPanel/index.ts`);
 * - an ancestor folder's own files are in scope (`../types.ts`), but not its barrel, which re-exports `F` (a cycle).
 *
 * Imports that leave the file's `src` tree, and package imports, are out of scope.
 *
 * Options:
 * - `barrels` (default `['index', 'testing']`): file stems that count as a folder's barrel, so a folder may expose test
 *   helpers through `testing.ts` without shipping them in `index.ts`.
 * - `allow`: importer file paths (matched as a path suffix) exempt from the rule, e.g. a subpath entry that imports
 *   single files to keep a dependency out of its bundle.
 *
 * @example
 * // X Bad
 * import { ToolsPanel } from '../panels/ToolsPanel/ToolsPanel.tsx';
 * import { toolForKey } from '../panels/ToolsPanel/index.ts';
 * import { Canvas } from '../index.ts';
 *
 * // OK Good
 * import { ToolsPanel, toolForKey } from '../panels/index.ts';
 * import { type PanelProps } from '../types.ts';
 */

const DEFAULT_BARRELS = ['index', 'testing'];

const SOURCE_EXTENSION = /\.[cm]?[jt]sx?$/;

/** The nearest `src` folder at or above `dir`: the tree the rule polices. */
const srcRoot = (dir) => {
  const parts = dir.split(path.sep);
  const index = parts.lastIndexOf('src');
  return index < 0 ? undefined : parts.slice(0, index + 1).join(path.sep);
};

const isWithin = (dir, root) => dir === root || dir.startsWith(root + path.sep);

/** A path as an import specifier relative to `from`, with a leading `./` for a descendant. */
const specifier = (from, to) => {
  const relative = path.relative(from, to).split(path.sep).join('/');
  return relative.startsWith('.') ? relative : `./${relative}`;
};

/**
 * Checks one relative import, returning the problem (message id and the barrel to use) or undefined.
 * Exported for tests.
 */
export const checkImport = (filename, source, { barrels = DEFAULT_BARRELS } = {}) => {
  if (!source.startsWith('./') && !source.startsWith('../')) {
    return undefined;
  }
  const fromDir = path.dirname(filename);
  const root = srcRoot(fromDir);
  const target = path.resolve(fromDir, source);
  const targetDir = path.dirname(target);
  if (!root || !isWithin(targetDir, root) || targetDir === fromDir) {
    return undefined;
  }
  const baseName = path.basename(target);
  const targetStem = baseName.replace(SOURCE_EXTENSION, '');
  const isBarrel = SOURCE_EXTENSION.test(baseName) && barrels.includes(targetStem);
  // Suggest the barrel of the same kind (`testing` for `testing`), else the primary one.
  const barrelFile = `${isBarrel ? targetStem : barrels[0]}.ts`;

  // Below `F`: only a direct child's barrel.
  if (isWithin(targetDir, fromDir)) {
    const [child, ...deeper] = path.relative(fromDir, targetDir).split(path.sep);
    if (deeper.length === 0 && isBarrel) {
      return undefined;
    }
    return { messageId: 'descendant', barrel: specifier(fromDir, path.join(fromDir, child, barrelFile)) };
  }

  // Above `F`: its files are in scope; its barrel re-exports `F`.
  if (isWithin(fromDir, targetDir)) {
    return isBarrel ? { messageId: 'ancestorBarrel' } : undefined;
  }

  // Across: through the barrel of the first folder below the common ancestor.
  let common = targetDir;
  while (!isWithin(fromDir, common)) {
    common = path.dirname(common);
  }
  const [top, ...deeper] = path.relative(common, targetDir).split(path.sep);
  if (deeper.length === 0 && isBarrel) {
    return undefined;
  }
  return { messageId: 'across', barrel: specifier(fromDir, path.join(common, top, barrelFile)) };
};

export default {
  meta: {
    type: 'problem',
    docs: {
      description: "require imports into another folder to go through that folder's barrel",
      category: 'Best Practices',
      recommended: false,
    },
    schema: [
      {
        type: 'object',
        properties: {
          barrels: {
            type: 'array',
            items: { type: 'string' },
            minItems: 1,
            description: "File stems that count as a folder's barrel.",
          },
          allow: {
            type: 'array',
            items: { type: 'string' },
            description: 'Importer file paths (matched as a path suffix) exempt from the rule.',
          },
        },
        additionalProperties: false,
      },
    ],
    messages: {
      descendant: 'Import a child folder through its barrel: "{{barrel}}".',
      across: 'Import another folder through its barrel: "{{barrel}}".',
      ancestorBarrel: "Don't import an ancestor folder's barrel, which re-exports this folder; import the file itself.",
    },
  },
  create: (context) => {
    const filename = context.filename ?? context.getFilename();
    const { barrels = DEFAULT_BARRELS, allow = [] } = context.options[0] ?? {};
    const normalizedPath = filename.split(path.sep).join('/');
    if (allow.some((entry) => normalizedPath === entry || normalizedPath.endsWith(`/${entry}`))) {
      return {};
    }
    const check = (node) => {
      if (!node.source || typeof node.source.value !== 'string') {
        return;
      }
      const problem = checkImport(filename, node.source.value, { barrels });
      if (problem) {
        context.report({ node: node.source, messageId: problem.messageId, data: { barrel: problem.barrel } });
      }
    };
    return {
      ImportDeclaration: check,
      ExportNamedDeclaration: check,
      ExportAllDeclaration: check,
      ImportExpression: check,
    };
  },
};
