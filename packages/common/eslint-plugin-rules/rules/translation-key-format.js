//
// Copyright 2025 DXOS.org
//

'use strict';

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
 * Check if a key uses dot.camelCase format (no spaces).
 */
const isDotNotation = (key) => {
  const base = stripPluralSuffix(key);
  return !base.includes(' ');
};

/**
 * Convert a space-separated key to dot.camelCase format.
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
    const camel = pathWords[0] + pathWords.slice(1).map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join('');
    return `${camel}.${lastWord}${pluralSuffix}`;
  }

  // No valid suffix — camelCase everything.
  const camel = words[0] + words.slice(1).map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join('');
  return `${camel}${pluralSuffix}`;
};

export default {
  meta: {
    type: 'suggestion',
    fixable: 'code',
    docs: {
      description: 'Enforce translation key format: dot.camelCase with required type suffix.',
    },
    messages: {
      missingSuffix:
        'Translation key "{{key}}" must end with a type suffix: {{suffixes}}.',
      useDotsNotSpaces:
        'Translation key "{{key}}" should use dot.camelCase format. Suggested: "{{suggested}}".',
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

    /**
     * Check a string literal node that represents a translation key.
     */
    const checkKey = (node, key) => {
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
        return; // Only report one issue per key.
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

    return {
      // t('some key') — CallExpression where callee is `t`.
      CallExpression(node) {
        if (
          node.callee.type === 'Identifier' &&
          node.callee.name === 't' &&
          node.arguments.length >= 1 &&
          node.arguments[0].type === 'Literal' &&
          typeof node.arguments[0].value === 'string'
        ) {
          checkKey(node.arguments[0], node.arguments[0].value);
        }
      },

      // 'some key' in translation definition objects (Property key as string literal).
      // Matches: { 'some key': 'value' } inside translations.ts files.
      Property(node) {
        const filename = context.filename || context.getFilename();
        if (!filename.includes('translations')) {
          return;
        }

        if (
          node.key.type === 'Literal' &&
          typeof node.key.value === 'string' &&
          node.value.type === 'Literal' &&
          typeof node.value.value === 'string'
        ) {
          checkKey(node.key, node.key.value);
        }
      },
    };
  },
};
