//
// Copyright 2026 DXOS.org
//

import fs from 'node:fs';
import path from 'node:path';

const SOURCE_EXTENSIONS = /\.[cm]?[jt]sx?$/;

/**
 * The part of a file name before its first dot, so `Space.tsx`, `Space.test.ts` and `Space.stories.tsx`
 * all belong to the module `Space`.
 */
const stem = (baseName) => baseName.split('.')[0];

/**
 * Folds case, separators and a trailing plural so that `Space`, `spaces`, `space-item`/`SpaceItem` and
 * `Capability`/`Capabilities` collide.
 */
export const normalizeStem = (value) => {
  const folded = value.toLowerCase().replace(/[-_]/g, '');
  if (folded.endsWith('ies') && folded.length > 3) {
    return `${folded.slice(0, -3)}y`;
  }
  if (/(s|x|z|ch|sh)es$/.test(folded)) {
    return folded.slice(0, -2);
  }
  if (folded.endsWith('s') && !folded.endsWith('ss') && folded.length > 1) {
    return folded.slice(0, -1);
  }
  return folded;
};

/**
 * ESLint rule to prevent sibling source files whose names differ only by case, separators, or a plural suffix.
 * Such pairs are ambiguous to import and collide on case-insensitive filesystems.
 *
 * @example
 * // ❌ Bad (same directory)
 * Space.ts + Spaces.ts
 * IconRegistry.ts + icon-registry.ts
 * SpaceCapability.ts + SpaceCapabilities.ts
 *
 * // ✅ Good
 * Space.ts + Space.test.ts + Space.stories.tsx
 */
export default {
  meta: {
    type: 'problem',
    docs: {
      description: 'disallow sibling files whose names differ only by case, separators, or plural suffix',
      category: 'Best Practices',
      recommended: true,
    },
    schema: [
      {
        type: 'object',
        properties: {
          allow: {
            type: 'array',
            items: { type: 'string' },
            description: 'File paths (matched as a path suffix) exempt from the rule.',
          },
        },
        additionalProperties: false,
      },
    ],
    messages: {
      similarSibling:
        '"{{file}}" is named too similarly to sibling "{{siblings}}"; merge them or choose distinct names.',
    },
  },
  create: (context) => {
    const allow = context.options[0]?.allow ?? [];
    const filePath = context.filename;
    const baseName = path.basename(filePath);
    if (!SOURCE_EXTENSIONS.test(baseName)) {
      return {};
    }

    const normalizedPath = filePath.split(path.sep).join('/');
    if (allow.some((entry) => normalizedPath === entry || normalizedPath.endsWith(`/${entry}`))) {
      return {};
    }

    return {
      Program: (node) => {
        let entries;
        try {
          entries = fs.readdirSync(path.dirname(filePath), { withFileTypes: true });
        } catch {
          // Virtual or in-memory files have no directory to compare against.
          return;
        }

        const ownStem = stem(baseName);
        const ownKey = normalizeStem(ownStem);
        const siblings = entries
          .filter((entry) => entry.isFile() && SOURCE_EXTENSIONS.test(entry.name))
          .map((entry) => entry.name)
          .filter((name) => stem(name) !== ownStem && normalizeStem(stem(name)) === ownKey)
          .sort();

        if (siblings.length > 0) {
          context.report({
            node,
            messageId: 'similarSibling',
            data: { file: baseName, siblings: siblings.join('", "') },
          });
        }
      },
    };
  },
};
