//
// Copyright 2025 DXOS.org
//

'use strict';

import { readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';

/**
 * Valid type suffixes for translation keys.
 */
const VALID_SUFFIXES = ['label', 'message', 'placeholder', 'title', 'description', 'heading', 'alt', 'button'];

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
 */
const hasValidSuffix = (key) => {
  const base = stripPluralSuffix(key);
  return VALID_SUFFIXES.some((suffix) => {
    // Key is exactly the suffix, or ends with a separator + suffix.
    return base === suffix || base.endsWith(`.${suffix}`) || base.endsWith(` ${suffix}`);
  });
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
 * Walk up from a file path to find the plugin root (directory containing meta.ts in src/).
 */
const findPluginDir = (filePath) => {
  let dir = dirname(filePath);
  for (let i = 0; i < 10; i++) {
    if (existsSync(join(dir, 'src/meta.ts'))) {
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
 * Read meta.id from a plugin's meta.ts.
 */
const readMetaId = (pluginDir) => {
  const metaPath = join(pluginDir, 'src/meta.ts');
  if (!existsSync(metaPath)) {
    return null;
  }
  const content = readFileSync(metaPath, 'utf-8');
  const match = content.match(/id:\s*['"]([^'"]+)['"]/);
  return match ? match[1] : null;
};

/**
 * Extract translation keys for the meta.id namespace from a translations.ts file.
 */
const readTranslationKeys = (pluginDir, metaId) => {
  const keys = new Set();
  const translationsPath = join(pluginDir, 'src/translations.ts');
  if (!existsSync(translationsPath)) {
    return keys;
  }

  const content = readFileSync(translationsPath, 'utf-8');
  const lines = content.split('\n');
  let inMetaBlock = false;
  let braceDepth = 0;

  for (const line of lines) {
    const trimmed = line.trim();

    if (trimmed.match(/\[meta\.id\]\s*:\s*\{/)) {
      inMetaBlock = true;
      braceDepth = 1;
      continue;
    }

    if (inMetaBlock) {
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
        inMetaBlock = false;
      }
    }
  }

  return keys;
};

/**
 * Get plugin info (metaId + valid keys) for a file, with caching.
 */
const getPluginInfo = (filePath) => {
  const pluginDir = findPluginDir(filePath);
  if (!pluginDir) {
    return null;
  }

  if (pluginCache.has(pluginDir)) {
    return pluginCache.get(pluginDir);
  }

  const metaId = readMetaId(pluginDir);
  if (!metaId) {
    pluginCache.set(pluginDir, null);
    return null;
  }

  const keys = readTranslationKeys(pluginDir, metaId);
  const info = { metaId, keys };
  pluginCache.set(pluginDir, info);
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
        'Translation key "{{key}}" must end with a type suffix: {{suffixes}}.',
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

    // Resolve plugin info for this file.
    const pluginInfo = getPluginInfo(filename);

    // Check source text once to determine if this is a translation-aware file.
    const sourceText = (context.sourceCode || context.getSourceCode()).text;
    const usesTranslation = sourceText.includes('useTranslation');
    const usesMetaNamespace = sourceText.includes('useTranslation(meta.id)');

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

      // Check 2: Must end with a valid suffix.
      if (!hasValidSuffix(key)) {
        context.report({
          node,
          messageId: 'missingSuffix',
          data: { key, suffixes: suffixes.join(', ') },
        });
      }
    };

    /**
     * Check that a key exists in the plugin's translations.
     */
    const checkKeyExists = (node, key, hasNsOverride) => {
      // Only check if we resolved the plugin and the file uses meta.id namespace.
      if (!pluginInfo || !usesMetaNamespace || hasNsOverride) {
        return;
      }

      if (!pluginInfo.keys.has(key)) {
        context.report({
          node,
          messageId: 'undefinedKey',
          data: { key, namespace: pluginInfo.metaId },
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
