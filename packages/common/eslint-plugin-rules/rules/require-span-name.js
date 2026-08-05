//
// Copyright 2026 DXOS.org
//

'use strict';

/**
 * Matches `trace.span(...)` and `trace.spanStart(...)` call sites (including the
 * `@trace.span()` decorator form and `_trace.spanStart()` import aliases ending in `trace`).
 */
const isTraceSpanCallSite = (node) => {
  if (node.callee.type !== 'MemberExpression' || node.callee.property.type !== 'Identifier') {
    return false;
  }
  const method = node.callee.property.name;
  if (method !== 'span' && method !== 'spanStart') {
    return false;
  }
  const object = node.callee.object;
  return object.type === 'Identifier' && /(^|_)trace$/i.test(object.name);
};

const hasNameProperty = (node) =>
  node.arguments.length > 0 &&
  node.arguments[0].type === 'ObjectExpression' &&
  node.arguments[0].properties.some(
    (property) =>
      property.type === 'Property' && !property.computed && (property.key.name ?? property.key.value) === 'name',
  );

export default {
  meta: {
    type: 'problem',
    docs: {
      description:
        'Requires an explicit `name` on trace.span()/trace.spanStart(). Runtime-derived names ' +
        '(`constructor.name`) are mangled by minified production builds into unreadable span names.',
    },
  },
  create(context) {
    return {
      CallExpression(node) {
        if (isTraceSpanCallSite(node) && !hasNameProperty(node)) {
          context.report({
            node,
            message:
              "Explicit span name required: trace.span({ name: 'ClassName.methodName', ... }) — " +
              'runtime-derived names are minified in production builds (tracing-improvement-spec DX-T1).',
          });
        }
      },
    };
  },
};
