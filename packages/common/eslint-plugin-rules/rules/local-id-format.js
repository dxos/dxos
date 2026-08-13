//
// Copyright 2026 DXOS.org
//

'use strict';

/**
 * Runtime validator mirrored from `app-framework`'s `isValidLocalId` and `app-graph`'s copy of it.
 * Both drop a malformed contribution with only a `log.warn`, so a hyphenated id disables the
 * surface (or graph extension) silently — this rule turns that into a lint error at the source.
 */
const isValidLocalId = (id) => /^[a-zA-Z][a-zA-Z0-9]*$/.test(id.split('.').pop() ?? '');

/** Callees whose options-bag `id` the runtime validates. */
const VALIDATED_CALLEES = new Set(['create', 'createExtension', 'createExtensionRaw']);

/** Namespaces the validated callees are reached through; a bare `create()` is something else. */
const VALIDATED_NAMESPACES = new Set(['Surface', 'GraphBuilder']);

/** Rewrites the final segment to camelCase, leaving any dotted prefix untouched. */
const toCamelCase = (id) => {
  const segments = id.split('.');
  const last = segments.pop() ?? '';
  const camel = last
    .split(/[-_]+/)
    .filter(Boolean)
    .map((word, index) => (index === 0 ? word : word[0].toUpperCase() + word.slice(1)))
    .join('');
  return [...segments, camel].join('.');
};

/** Resolves the call's callee name, whether namespaced (`Surface.create`) or bare. */
const getCalleeName = (callee) => {
  if (callee.type === 'Identifier') {
    return { name: callee.name, namespace: undefined };
  }
  if (
    callee.type === 'MemberExpression' &&
    !callee.computed &&
    callee.property.type === 'Identifier' &&
    callee.object.type === 'Identifier'
  ) {
    return { name: callee.property.name, namespace: callee.object.name };
  }
  return { name: undefined, namespace: undefined };
};

export default {
  meta: {
    type: 'problem',
    fixable: 'code',
    docs: {
      description:
        'Surface and graph-extension ids must end in a camelCase segment; the runtime silently drops the contribution otherwise.',
      recommended: true,
    },
    messages: {
      invalidLocalId:
        'Id "{{id}}" is dropped at runtime: the final segment must be camelCase (no hyphens or underscores). Use "{{suggested}}".',
    },
    schema: [],
  },

  create(context) {
    return {
      CallExpression(node) {
        const { name, namespace } = getCalleeName(node.callee);
        if (!name || !VALIDATED_CALLEES.has(name)) {
          return;
        }
        // `Surface.create` is namespaced; `createExtension` is usually imported bare.
        if (namespace !== undefined && !VALIDATED_NAMESPACES.has(namespace)) {
          return;
        }
        if (name === 'create' && namespace === undefined) {
          return;
        }

        const [options] = node.arguments;
        if (!options || options.type !== 'ObjectExpression') {
          return;
        }

        const idProperty = options.properties.find(
          (property) =>
            property.type === 'Property' &&
            !property.computed &&
            ((property.key.type === 'Identifier' && property.key.name === 'id') ||
              (property.key.type === 'Literal' && property.key.value === 'id')),
        );
        if (
          !idProperty ||
          idProperty.value.type !== 'Literal' ||
          typeof idProperty.value.value !== 'string' ||
          isValidLocalId(idProperty.value.value)
        ) {
          return;
        }

        const id = idProperty.value.value;
        const suggested = toCamelCase(id);
        context.report({
          node: idProperty.value,
          messageId: 'invalidLocalId',
          data: { id, suggested },
          // Only offer the rewrite when it actually lands on a valid id (an id starting with a
          // digit, say, has no mechanical fix).
          fix: isValidLocalId(suggested) ? (fixer) => fixer.replaceText(idProperty.value, `'${suggested}'`) : undefined,
        });
      },
    };
  },
};
