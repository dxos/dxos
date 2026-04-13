//
// Copyright 2025 DXOS.org
//

/**
 * ESLint rule to enforce that the callback parameter name in Obj.change(),
 * Relation.change(), and Entity.change() matches the first argument name.
 *
 * @example
 * // ❌ Bad
 * Obj.change(trigger, (t) => { t.enabled = true; });
 * Obj.change(trigger, (mutableTrigger) => { mutableTrigger.enabled = true; });
 *
 * // ✅ Good
 * Obj.change(trigger, (trigger) => { trigger.enabled = true; });
 */
export default {
  meta: {
    type: 'suggestion',
    docs: {
      description:
        'Enforce callback parameter name matches the first argument in Obj.change, Relation.change, and Entity.change.',
      category: 'Best Practices',
      recommended: true,
    },
    fixable: 'code',
    schema: [],
    messages: {
      mismatchedName:
        'Callback parameter "{{callbackParam}}" should be "{{firstArg}}" to match the first argument of {{caller}}.change().',
    },
  },
  create(context) {
    /** Yield all Identifier reference nodes for `name` inside `node`, respecting scope shadowing. */
    function* collectReferences(node, name) {
      if (!node || typeof node !== 'object' || !node.type) {
        return;
      }

      if (
        node.type === 'ArrowFunctionExpression' ||
        node.type === 'FunctionExpression' ||
        node.type === 'FunctionDeclaration'
      ) {
        if (node.params?.some((p) => p.type === 'Identifier' && p.name === name)) {
          return;
        }
        yield* collectReferences(node.body, name);
        return;
      }

      if (node.type === 'Identifier' && node.name === name) {
        yield node;
        return;
      }

      for (const key of Object.keys(node)) {
        if (key === 'parent') {
          continue;
        }
        if (node.type === 'MemberExpression' && key === 'property' && !node.computed) {
          continue;
        }
        if (node.type === 'Property' && key === 'key' && !node.computed && !node.shorthand) {
          continue;
        }

        const child = node[key];
        if (Array.isArray(child)) {
          for (const item of child) {
            if (item && typeof item === 'object' && item.type) {
              yield* collectReferences(item, name);
            }
          }
        } else if (child && typeof child === 'object' && child.type) {
          yield* collectReferences(child, name);
        }
      }
    }

    return {
      CallExpression(node) {
        const { callee } = node;

        if (
          callee.type !== 'MemberExpression' ||
          callee.object.type !== 'Identifier' ||
          !['Obj', 'Relation', 'Entity'].includes(callee.object.name) ||
          callee.property.type !== 'Identifier' ||
          callee.property.name !== 'change'
        ) {
          return;
        }

        const args = node.arguments;
        if (args.length < 2) {
          return;
        }

        const firstArg = args[0];
        const callback = args[1];

        if (firstArg.type !== 'Identifier') {
          return;
        }
        if (callback.type !== 'ArrowFunctionExpression' && callback.type !== 'FunctionExpression') {
          return;
        }
        if (callback.params.length !== 1) {
          return;
        }

        const param = callback.params[0];
        if (param.type !== 'Identifier') {
          return;
        }
        if (param.name === firstArg.name) {
          return;
        }

        context.report({
          node: param,
          messageId: 'mismatchedName',
          data: {
            callbackParam: param.name,
            firstArg: firstArg.name,
            caller: callee.object.name,
          },
          fix(fixer) {
            const oldName = param.name;
            const newName = firstArg.name;

            const fixes = [fixer.replaceTextRange([param.range[0], param.range[0] + oldName.length], newName)];
            for (const ref of collectReferences(callback.body, oldName)) {
              fixes.push(fixer.replaceTextRange([ref.range[0], ref.range[0] + oldName.length], newName));
            }
            return fixes;
          },
        });
      },
    };
  },
};
