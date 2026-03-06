//
// Copyright 2026 DXOS.org
//

/**
 * ESLint rule enforcing `ctx: Context` as the first parameter on class methods.
 * Supports allowlists for exempt classes and methods (user-facing public APIs).
 */

'use strict';

const firstParamIsContext = (params) => {
  if (params.length === 0) {
    return false;
  }
  const firstParam = params[0];
  const annotation = firstParam.typeAnnotation?.typeAnnotation;
  if (!annotation) {
    return false;
  }
  if (annotation.type === 'TSTypeReference' && annotation.typeName?.type === 'Identifier') {
    return annotation.typeName.name === 'Context';
  }
  return false;
};

const getClassName = (node) => {
  let parent = node.parent;
  while (parent) {
    if (parent.type === 'ClassDeclaration' || parent.type === 'ClassExpression') {
      return parent.id?.name ?? null;
    }
    parent = parent.parent;
  }
  return null;
};

export default {
  meta: {
    type: 'suggestion',
    docs: {
      description: 'Require ctx: Context as first parameter on class methods.',
    },
    schema: [
      {
        type: 'object',
        properties: {
          allowClasses: {
            type: 'array',
            items: { type: 'string' },
            description: 'Class names fully exempt from this rule.',
          },
          allowMethods: {
            type: 'array',
            items: { type: 'string' },
            description: 'Method names exempt from this rule in any class.',
          },
        },
        additionalProperties: false,
      },
    ],
    messages: {
      missingContext:
        'Method "{{ className }}.{{ methodName }}" must have `ctx: Context` as its first parameter.',
    },
  },

  create(context) {
    const options = context.options[0] || {};
    const allowClasses = new Set(options.allowClasses || []);
    const allowMethods = new Set(options.allowMethods || []);

    return {
      MethodDefinition(node) {
        if (node.kind === 'constructor' || node.kind === 'get' || node.kind === 'set') {
          return;
        }

        if (node.static) {
          return;
        }

        const methodName = node.key.type === 'Identifier' ? node.key.name : null;
        if (!methodName) {
          return;
        }

        if (allowMethods.has(methodName)) {
          return;
        }

        const className = getClassName(node);
        if (className && allowClasses.has(className)) {
          return;
        }

        const params = node.value.params || [];
        if (!firstParamIsContext(params)) {
          context.report({
            node: node.key,
            messageId: 'missingContext',
            data: {
              className: className || '<anonymous>',
              methodName,
            },
          });
        }
      },
    };
  },
};
