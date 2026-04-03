//
// Copyright 2025 DXOS.org
//

'use strict';

import { readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';

/**
 * Valid type suffixes for translation keys.
 */
const VALID_SUFFIXES = ['label', 'message', 'placeholder', 'title', 'description', 'heading', 'alt', 'button', 'name', 'value'];

/**
 * Plural suffixes appended by i18next.
 */
const PLURAL_SUFFIXES = ['_zero', '_one', '_other'];

/**
 * Strip i18next plural suffix from a key.
 */
const stripPluralSuffix = (key) => {
  for (const suffix of PLURAL_SUFFIXES) {
    if (key.endsWith(suffix)) {
      return key.slice(0, -suffix.length);
    }
  }
  return key;
};

/**
 * Get the plural suffix if present.
 */
const getPluralSuffix = (key) => {
  for (const suffix of PLURAL_SUFFIXES) {
    if (key.endsWith(suffix)) {
      return suffix;
    }
  }
  return '';
};

/**
 * Check if a key has a valid type suffix (after stripping plural suffix).
 * Only dot-separated suffixes are considered valid (e.g., 'foo.label').
 */
const hasValidSuffix = (key) => {
  const base = stripPluralSuffix(key);
  return VALID_SUFFIXES.some((suffix) => {
    return base === suffix || base.endsWith(`.${suffix}`);
  });
};

/**
 * Check if a key has a suffix joined by hyphen instead of dot (e.g., 'plugin-name').
 * Returns the corrected key if fixable, null otherwise.
 */
const fixHyphenatedSuffix = (key) => {
  const pluralSuffix = getPluralSuffix(key);
  const base = stripPluralSuffix(key);
  for (const suffix of VALID_SUFFIXES) {
    if (base.endsWith(`-${suffix}`) && base.length > suffix.length + 1) {
      const prefix = base.slice(0, -(suffix.length + 1));
      return `${prefix}.${suffix}${pluralSuffix}`;
    }
  }
  return null;
};

/**
 * Check if a key uses dot.kebab-case format (no spaces).
 */
const isDotNotation = (key) => {
  const base = stripPluralSuffix(key);
  return !base.includes(' ');
};

/**
 * Convert a space-separated key to dot.kebab-case format.
 */
const toDotNotation = (key) => {
  const pluralSuffix = getPluralSuffix(key);
  const base = stripPluralSuffix(key);
  const words = base.split(' ');

  if (words.length <= 1) {
    return key;
  }

  const lastWord = words[words.length - 1];
  const isLastWordSuffix = VALID_SUFFIXES.includes(lastWord);

  if (isLastWordSuffix) {
    const pathWords = words.slice(0, -1);
    const kebab = pathWords.join('-');
    return `${kebab}.${lastWord}${pluralSuffix}`;
  }

  // No valid suffix — kebab-case everything.
  const kebab = words.join('-');
  return `${kebab}${pluralSuffix}`;
};

// --- Key validation: resolve meta.id and load translations ---

/** Cache: pluginDir → { metaId, keys } */
const pluginCache = new Map();

/**
 * Walk up from a file path to find the package root (directory containing src/translations.ts).
 */
const findPackageDir = (filePath) => {
  let dir = dirname(filePath);
  for (let i = 0; i < 10; i++) {
    if (existsSync(join(dir, 'src/translations.ts'))) {
      return dir;
    }
    const parent = dirname(dir);
    if (parent === dir) {
      break;
    }
    dir = parent;
  }
  return null;
};

/**
 * Resolve the namespace identifier for a package.
 * Plugins use meta.id from src/meta.ts.
 * UI packages use translationKey from src/translations.ts.
 */
const resolveNamespace = (packageDir) => {
  // Try plugin pattern: src/meta.ts with id field.
  const metaPath = join(packageDir, 'src/meta.ts');
  if (existsSync(metaPath)) {
    const content = readFileSync(metaPath, 'utf-8');
    const match = content.match(/id:\s*['"]([^'"]+)['"]/);
    if (match) {
      return { namespace: match[1], source: 'meta.id' };
    }
  }

  // Try UI package pattern: export const translationKey = '...'.
  const translationsPath = join(packageDir, 'src/translations.ts');
  if (existsSync(translationsPath)) {
    const content = readFileSync(translationsPath, 'utf-8');
    const match = content.match(/export\s+const\s+translationKey\s*=\s*['"]([^'"]+)['"]/);
    if (match) {
      return { namespace: match[1], source: 'translationKey' };
    }
  }

  return null;
};

/**
 * Extract translation keys for the primary namespace from a translations.ts file.
 * Handles both [meta.id]: { ... } and [translationKey]: { ... } patterns.
 */
const readTranslationKeys = (packageDir, nsSource) => {
  const keys = new Set();
  const translationsPath = join(packageDir, 'src/translations.ts');
  if (!existsSync(translationsPath)) {
    return keys;
  }

  const content = readFileSync(translationsPath, 'utf-8');
  const lines = content.split('\n');
  let inBlock = false;
  let braceDepth = 0;

  // Match the namespace block header based on the source pattern.
  const blockPattern = nsSource === 'meta.id'
    ? /\[meta\.id\]\s*:\s*\{/
    : /\[translationKey\]\s*:\s*\{/;

  for (const line of lines) {
    const trimmed = line.trim();

    if (!inBlock && trimmed.match(blockPattern)) {
      inBlock = true;
      braceDepth = 1;
      continue;
    }

    if (inBlock) {
      for (const ch of trimmed) {
        if (ch === '{') {
          braceDepth++;
        }
        if (ch === '}') {
          braceDepth--;
        }
      }

      const keyMatch = trimmed.match(/^['"]([^'"]+)['"]\s*:/);
      if (keyMatch && braceDepth >= 1) {
        keys.add(keyMatch[1]);
      }

      if (braceDepth <= 0) {
        inBlock = false;
      }
    }
  }

  return keys;
};

/**
 * Get package info (namespace + valid keys) for a file, with caching.
 */
const getPackageInfo = (filePath) => {
  const packageDir = findPackageDir(filePath);
  if (!packageDir) {
    return null;
  }

  if (pluginCache.has(packageDir)) {
    return pluginCache.get(packageDir);
  }

  const nsInfo = resolveNamespace(packageDir);
  if (!nsInfo) {
    pluginCache.set(packageDir, null);
    return null;
  }

  const keys = readTranslationKeys(packageDir, nsInfo.source);
  const info = { namespace: nsInfo.namespace, nsSource: nsInfo.source, keys };
  pluginCache.set(packageDir, info);
  return info;
};

export default {
  meta: {
    type: 'suggestion',
    fixable: 'code',
    docs: {
      description: 'Enforce translation key format: dot.kebab-case with required type suffix. Validates keys exist in translations.',
    },
    messages: {
      missingSuffix:
        'Invalid translation key: "{{key}}"',
      useDotsNotSpaces:
        'Translation key "{{key}}" should use dot.kebab-case format. Suggested: "{{suggested}}".',
      undefinedKey:
        'Translation key "{{key}}" is not defined in translations for namespace "{{namespace}}".',
    },
    schema: [
      {
        type: 'object',
        properties: {
          suffixes: {
            type: 'array',
            items: { type: 'string' },
          },
        },
        additionalProperties: false,
      },
    ],
  },

  create(context) {
    const options = context.options[0] || {};
    const suffixes = options.suffixes || VALID_SUFFIXES;
    const filename = context.filename || (context.getFilename && context.getFilename()) || context.physicalFilename || '';

    // Check source text once to determine if this is a translation-aware file.
    const sourceText = (context.sourceCode || context.getSourceCode()).text;
    const usesTranslation = sourceText.includes('useTranslation');
    const usesStaticNamespace = sourceText.includes('useTranslation(meta.id)') || sourceText.includes('useTranslation(translationKey)');

    // Resolve package info for this file (works for both plugins and UI packages).
    const packageInfo = getPackageInfo(filename);

    /**
     * Check a string literal node that represents a translation key.
     */
    const checkKeyFormat = (node, key) => {
      const base = stripPluralSuffix(key);

      // Check 1: Must use dot notation (no spaces).
      if (!isDotNotation(key)) {
        const suggested = toDotNotation(key);
        context.report({
          node,
          messageId: 'useDotsNotSpaces',
          data: { key, suggested },
          fix: (fixer) => fixer.replaceText(node, `'${suggested}'`),
        });
        return;
      }

      // Check 2: Suffix joined by hyphen instead of dot (e.g., 'plugin-name' → 'plugin.name').
      const fixedKey = fixHyphenatedSuffix(key);
      if (fixedKey) {
        context.report({
          node,
          messageId: 'useDotsNotSpaces',
          data: { key, suggested: fixedKey },
          fix: (fixer) => fixer.replaceText(node, `'${fixedKey}'`),
        });
        return;
      }

      // Check 3: Must end with a valid suffix.
      if (!hasValidSuffix(key)) {
        context.report({
          node,
          messageId: 'missingSuffix',
          data: { key, suffixes: suffixes.join(', ') },
        });
      }
    };

    /**
     * Check that a key exists in the package's translations.
     */
    const checkKeyExists = (node, key, hasNsOverride) => {
      // Only check if we resolved the package and the file uses a static namespace.
      if (!packageInfo || !usesStaticNamespace || hasNsOverride) {
        return;
      }

      // Check exact key, then check plural variants (i18next resolves 'foo.label' with { count } to 'foo.label_one'/'foo.label_other').
      const hasPluralVariant = PLURAL_SUFFIXES.some((suffix) => packageInfo.keys.has(key + suffix));
      if (!packageInfo.keys.has(key) && !hasPluralVariant) {
        context.report({
          node,
          messageId: 'undefinedKey',
          data: { key, namespace: packageInfo.namespace },
        });
      }
    };

    return {
      // t('some key') or t('some key', { ns: ... }).
      // Only fires in files that use useTranslation.
      CallExpression(node) {
        if (
          !usesTranslation ||
          node.callee.type !== 'Identifier' ||
          node.callee.name !== 't' ||
          node.arguments.length < 1 ||
          node.arguments[0].type !== 'Literal' ||
          typeof node.arguments[0].value !== 'string'
        ) {
          return;
        }

        const key = node.arguments[0].value;

        // Check format.
        checkKeyFormat(node.arguments[0], key);

        // Check if there's an ns override in the second argument.
        let hasNsOverride = false;
        if (node.arguments.length >= 2 && node.arguments[1].type === 'ObjectExpression') {
          hasNsOverride = node.arguments[1].properties.some(
            (prop) => prop.key && ((prop.key.type === 'Identifier' && prop.key.name === 'ns') || (prop.key.type === 'Literal' && prop.key.value === 'ns')),
          );
        }

        // Check existence.
        checkKeyExists(node.arguments[0], key, hasNsOverride);
      },

      // Label tuples: ['key', { ns: meta.id, ... }]
      // Matches ArrayExpression with a string literal first element and an object with an `ns` property.
      ArrayExpression(node) {
        if (
          node.elements.length >= 2 &&
          node.elements[0] &&
          node.elements[0].type === 'Literal' &&
          typeof node.elements[0].value === 'string' &&
          node.elements[1] &&
          node.elements[1].type === 'ObjectExpression' &&
          node.elements[1].properties.some(
            (prop) => prop.key && ((prop.key.type === 'Identifier' && prop.key.name === 'ns') || (prop.key.type === 'Literal' && prop.key.value === 'ns')),
          )
        ) {
          const key = node.elements[0].value;

          // Check format.
          checkKeyFormat(node.elements[0], key);

          // Check existence (determine if ns points to the package's own namespace).
          const nsProp = node.elements[1].properties.find(
            (prop) => prop.key && ((prop.key.type === 'Identifier' && prop.key.name === 'ns') || (prop.key.type === 'Literal' && prop.key.value === 'ns')),
          );
          const isOwnNamespace = nsProp && nsProp.value && (
            (nsProp.value.type === 'MemberExpression' &&
              nsProp.value.object.type === 'Identifier' && nsProp.value.object.name === 'meta' &&
              nsProp.value.property.type === 'Identifier' && nsProp.value.property.name === 'id') ||
            (nsProp.value.type === 'Identifier' && nsProp.value.name === 'translationKey')
          );
          checkKeyExists(node.elements[0], key, !isOwnNamespace);
        }
      },

      // Property keys in translations.ts files.
      // Guard: only check files whose source contains the translations export pattern.
      Property(node) {
        if (!sourceText.includes('satisfies Resource[]')) {
          return;
        }

        if (
          node.key.type === 'Literal' &&
          typeof node.key.value === 'string' &&
          node.value.type === 'Literal' &&
          typeof node.value.value === 'string'
        ) {
          checkKeyFormat(node.key, node.key.value);
        }
      },
    };
  },
};
