//
// Copyright 2025 DXOS.org
//

/**
 * Enforce namespace imports for specified packages for better tree-shaking.
 *
 * Examples enforced:
 *   import * as Effect from 'effect';            // OK
 *   import * as Schema from '@effect/schema';    // OK
 *   import { pipe } from 'effect';               // ERROR
 *   import { Schema } from '@effect/schema';     // ERROR
 *   import { AnthropicModel } from '@effect/ai-anthropic'; // ERROR
 *
 * Options:
 *   {
 *     packages?: string[]; // package identifiers or prefixes; supports entries ending with "*" as prefix wildcards
 *   }
 */

const DEFAULT_PACKAGES = ['effect', '@effect/*'];

const isTypeOnlyImport = (node) => node.importKind === 'type';

const matchesPackage = (source, patterns) => {
  for (const pattern of patterns) {
    if (pattern.endsWith('*')) {
      const prefix = pattern.slice(0, -1);
      if (source.startsWith(prefix)) return true;
    } else {
      if (source === pattern || source.startsWith(`${pattern}/`)) return true;
    }
  }
  return false;
};

export default {
  meta: {
    type: 'problem',
    docs: {
      description: 'Require namespace imports (import * as X from \"pkg\") for Effect packages to improve tree-shaking',
      recommended: false,
    },
    schema: [
      {
        type: 'object',
        properties: {
          packages: {
            type: 'array',
            items: { type: 'string' },
          },
        },
        additionalProperties: false,
      },
    ],
    messages: {
      useNamespaceImport:
        'Use a namespace import for "{{pkg}}" packages for better tree-shaking (e.g., import * as {{alias}} from "{{pkg}}")',
    },
  },
  create(context) {
    const options = context.options?.[0] ?? {};
    const patterns = Array.isArray(options.packages) && options.packages.length > 0 ? options.packages : DEFAULT_PACKAGES;

    const suggestAlias = (pkg) => {
      if (pkg === 'effect') return 'Effect';
      if (pkg.startsWith('@effect/schema')) return 'Schema';
      if (pkg.startsWith('@effect/ai-anthropic')) return 'Anthropic';
      if (pkg.startsWith('@effect/ai')) return 'AI';
      if (pkg.startsWith('@effect')) return 'Effect';
      const base = pkg.includes('/') ? pkg.split('/').pop() : pkg;
      return (base || 'Pkg')
        .split(/[^a-zA-Z0-9]/)
        .filter(Boolean)
        .map((s) => s[0].toUpperCase() + s.slice(1))
        .join('');
    };

    return {
      ImportDeclaration(node) {
        if (isTypeOnlyImport(node)) return;
        const source = node.source.value;
        if (typeof source !== 'string') return;

        if (!matchesPackage(source, patterns)) return;

        const hasNamespace = node.specifiers.some((s) => s.type === 'ImportNamespaceSpecifier');
        if (hasNamespace) return; // already OK

        const hasDisallowed = node.specifiers.some((s) => {
          if (s.type === 'ImportSpecifier' && s.importKind === 'type') return false;
          return s.type === 'ImportSpecifier' || s.type === 'ImportDefaultSpecifier';
        });
        if (!hasDisallowed) return;

        context.report({
          node,
          messageId: 'useNamespaceImport',
          data: { pkg: source, alias: suggestAlias(source) },
        });
      },
    };
  },
};


