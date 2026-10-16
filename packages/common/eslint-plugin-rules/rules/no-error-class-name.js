//
// Copyright 2026 DXOS.org
//

'use strict';

const ERROR_CLASS_RE = /^[A-Z]\w*Error$/;

const EQUALITY_OPERATORS = new Set(['===', '!==', '==', '!=']);

/** The trailing identifier of `Foo` or `Ns.Foo`. */
const className = (node) => {
  if (node.type === 'Identifier') {
    return node.name;
  }
  if (node.type === 'MemberExpression' && !node.computed && node.property.type === 'Identifier') {
    return node.property.name;
  }
  return undefined;
};

const isPropertyAccess = (node, property) =>
  node?.type === 'MemberExpression' &&
  !node.computed &&
  node.property.type === 'Identifier' &&
  node.property.name === property;

const unwrapChain = (node) => (node?.type === 'ChainExpression' ? node.expression : node);

/**
 * Disallow matching errors by their class's runtime `name`, which minification renames.
 * @example
 * // bad
 * registerError(UnknownProtocolError.name, decode);
 * if (err.constructor.name === 'TimeoutError') {}
 *
 * // good
 * registerError('UnknownProtocolError', decode);
 * if (TimeoutError.is(err)) {}
 */
export default {
  meta: {
    type: 'problem',
    docs: {
      description: 'Disallow identifying errors by the class name, which minified builds rename.',
      recommended: true,
    },
    messages: {
      errorClassName:
        '`{{name}}.name` is renamed by minification. Use the declared name string, or `{{name}}.is(error)` for a `BaseError.extend` class.',
      constructorName:
        '`constructor.name` is renamed by minification. Compare `error.name`, or use `.is(error)` for a `BaseError.extend` class.',
    },
    schema: [],
  },
  create(context) {
    return {
      MemberExpression(node) {
        if (!isPropertyAccess(node, 'name')) {
          return;
        }
        const name = className(node.object);
        if (name && ERROR_CLASS_RE.test(name)) {
          context.report({ node, messageId: 'errorClassName', data: { name } });
        }
      },
      BinaryExpression(node) {
        if (!EQUALITY_OPERATORS.has(node.operator)) {
          return;
        }
        for (const [access, other] of [
          [node.left, node.right],
          [node.right, node.left],
        ]) {
          const member = unwrapChain(access);
          if (
            isPropertyAccess(member, 'name') &&
            isPropertyAccess(member.object, 'constructor') &&
            other.type === 'Literal' &&
            typeof other.value === 'string' &&
            ERROR_CLASS_RE.test(other.value)
          ) {
            context.report({ node, messageId: 'constructorName' });
          }
        }
      },
    };
  },
};
