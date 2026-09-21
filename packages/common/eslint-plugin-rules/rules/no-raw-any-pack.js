//
// Copyright 2026 DXOS.org
//

'use strict';

/**
 * ESLint rule forcing every `Any` producer to name its `type_url` convention.
 *
 * `anyPack` writes the spec form `type.googleapis.com/<name>`, but the registries on both sides of
 * the EDGE boundary are split: credential assertions are keyed by the bare name, while the router
 * and messenger read the type out with `split('/')[1]` and need the prefix. Neither reader errors on
 * the wrong form — one 500s in production, the other silently yields `undefined` — so the choice has
 * to be visible at the call site rather than inherited from buf's default.
 * @example
 * // bad
 * anyPack(SomeSchema, message);
 * bufWkt.anyPack(SomeSchema, message);
 *
 * // good
 * anyPackBare(SomeSchema, message); // registries keyed by the bare type name
 * anyPackPrefixed(SomeSchema, message); // readers that strip a `type.googleapis.com/` prefix
 */
export default {
  meta: {
    type: 'problem',
    docs: {
      description: 'Disallow raw anyPack; require anyPackBare or anyPackPrefixed from @dxos/protocols/buf.',
      recommended: true,
    },
    messages: {
      noRawAnyPack:
        'Use anyPackBare or anyPackPrefixed from @dxos/protocols/buf instead of anyPack, so the type_url convention is explicit.',
    },
    schema: [],
  },
  create(context) {
    const report = (node) => context.report({ node, messageId: 'noRawAnyPack' });

    return {
      CallExpression(node) {
        const callee = node.callee;
        if (callee.type === 'Identifier' && callee.name === 'anyPack') {
          report(node);
          return;
        }

        // The namespace form, `bufWkt.anyPack(...)`, is how @dxos/protocols re-exports reach callers.
        if (
          callee.type === 'MemberExpression' &&
          !callee.computed &&
          callee.property.type === 'Identifier' &&
          callee.property.name === 'anyPack'
        ) {
          report(node);
        }
      },
    };
  },
};
