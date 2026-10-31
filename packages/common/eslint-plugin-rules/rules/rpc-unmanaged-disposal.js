//
// Copyright 2026 DXOS.org
//

'use strict';

const DEFAULT_OWNERS = ['RpcStubCache'];

const FUNCTION_TYPES = new Set(['ArrowFunctionExpression', 'FunctionExpression', 'FunctionDeclaration']);

/** Wrappers that change a value's static type or syntax but not who owns it. */
const TRANSPARENT_TYPES = new Set([
  'AwaitExpression',
  'ChainExpression',
  'ParenthesizedExpression',
  'TSAsExpression',
  'TSNonNullExpression',
  'TSSatisfiesExpression',
  'TSTypeAssertion',
]);

/**
 * A value reached through a service binding's `getUnmanaged()` carries stubs the caller owns: the binding does not
 * dispose it, so an undisposed one holds its RPC session (and, across processes, a TCP connection) until GC.
 * Require it to be held by `using`, or returned from a factory passed to an owner that disposes it.
 * The rule is syntactic: `getUnmanaged()` is the marker, since lint rules see no types.
 * @example
 * // bad
 * const sink = await Router.getUnmanaged().getRouterSink(ctx, did);
 *
 * // good
 * using sink = await Router.getUnmanaged().getRouterSink(ctx, did);
 * new RpcStubCache('router-sink', async (did) => Router.getUnmanaged().getRouterSink(ctx, did));
 */
export default {
  meta: {
    type: 'problem',
    docs: {
      description: 'Require values reached through getUnmanaged() to be disposed by `using` or handed to an owner.',
      recommended: true,
    },
    messages: {
      undisposed:
        'A value reached through getUnmanaged() is not disposed by the binding: hold it with `using`, or return it from a factory passed to {{owners}}.',
    },
    schema: [
      {
        type: 'object',
        properties: { owners: { type: 'array', items: { type: 'string' } } },
        additionalProperties: false,
      },
    ],
  },
  create(context) {
    const owners = context.options[0]?.owners ?? DEFAULT_OWNERS;

    /** Climbs `x.getUnmanaged().getByName(id).getRouterSink(…)`, `await`, optional chains and type assertions. */
    const outermost = (node) => {
      let expr = node;
      for (;;) {
        const parent = expr.parent;
        if (
          parent.type === 'MemberExpression' &&
          parent.object === expr &&
          parent.parent.type === 'CallExpression' &&
          parent.parent.callee === parent
        ) {
          expr = parent.parent;
        } else if (TRANSPARENT_TYPES.has(parent.type) && (parent.expression ?? parent.argument) === expr) {
          expr = parent;
        } else {
          return expr;
        }
      }
    };

    const isUsing = (expr) =>
      expr.parent.type === 'VariableDeclarator' &&
      expr.parent.init === expr &&
      (expr.parent.parent.kind === 'using' || expr.parent.parent.kind === 'await using');

    /** The function `expr` is the returned value of: an arrow's expression body, or a `return` inside a body. */
    const returningFunction = (expr) => {
      if (expr.parent.type === 'ArrowFunctionExpression' && expr.parent.body === expr) {
        return expr.parent;
      }
      if (expr.parent.type === 'ReturnStatement') {
        return context.sourceCode.getAncestors(expr).findLast((ancestor) => FUNCTION_TYPES.has(ancestor.type));
      }
      return undefined;
    };

    const isOwnedFactory = (expr) => {
      const fn = returningFunction(expr);
      const call = fn?.parent;
      return (
        call?.type === 'NewExpression' &&
        call.arguments.includes(fn) &&
        call.callee.type === 'Identifier' &&
        owners.includes(call.callee.name)
      );
    };

    return {
      CallExpression(node) {
        const { callee } = node;
        if (callee.type !== 'MemberExpression' || callee.property.type !== 'Identifier') {
          return;
        }
        if (callee.property.name !== 'getUnmanaged' || node.arguments.length > 0) {
          return;
        }
        const expr = outermost(node);
        if (!isUsing(expr) && !isOwnedFactory(expr)) {
          context.report({ node, messageId: 'undisposed', data: { owners: owners.join(', ') } });
        }
      },
    };
  },
};
