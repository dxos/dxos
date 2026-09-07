//
// Copyright 2025 DXOS.org
//

/**
 * ESLint rule to enforce that every mutation inside Obj.update(), Relation.update() and
 * Entity.update() goes through the callback's parameter, and that the parameter is named after the
 * first argument so it shadows it.
 *
 * Writability belongs to the reference the callback is handed, not to the callback's dynamic extent:
 * the object named outside is read-only, and only the parameter can be mutated. Naming them alike is
 * what makes that mechanical — the outer name is shadowed, so a body that mentions it reaches the
 * mutable reference and cannot silently address the read-only one.
 *
 * @example
 * // ❌ Bad
 * Obj.update(trigger, (t) => { t.enabled = true; });
 * Obj.update(trigger, () => { Text.update(trigger, 'name', 'x'); });
 *
 * // ✅ Good
 * Obj.update(trigger, (trigger) => { trigger.enabled = true; });
 * Obj.update(trigger, (trigger) => { Text.update(trigger, 'name', 'x'); });
 */
export default {
  meta: {
    type: 'suggestion',
    docs: {
      description:
        'Enforce that Obj.update, Relation.update and Entity.update mutate through a callback parameter named after the first argument.',
      category: 'Best Practices',
      recommended: true,
    },
    fixable: 'code',
    schema: [],
    messages: {
      mismatchedName:
        'Callback parameter "{{callbackParam}}" should be "{{firstArg}}" to match the first argument of {{caller}}.update().',
      missingParam:
        'Callback must declare a parameter "{{firstArg}}" — mutations go through it, not through the object named outside {{caller}}.update().',
      unnameableTarget:
        'Callback must declare a parameter to mutate through; {{caller}}.update() was passed an expression rather than a variable, so assign it to one first.',
      outerMutation:
        'Mutating "{{name}}", which was captured outside the callback and is read-only there. Reach the same value through the callback parameter instead.',
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

    /**
     * Array methods that mutate the receiver. Deliberately only arrays: a document holds plain data,
     * so `Map`/`Set` names like `add` and `set` would only ever match an unrelated API call
     * (`space.db.add(…)`).
     */
    const MUTATING_METHODS = new Set([
      'push',
      'pop',
      'shift',
      'unshift',
      'splice',
      'sort',
      'reverse',
      'fill',
      'copyWithin',
    ]);

    /** The leftmost identifier of a member chain — `a.b.c` → `a`. */
    function baseIdentifier(node) {
      let current = node;
      while (current?.type === 'MemberExpression') {
        current = current.object;
      }
      return current?.type === 'Identifier' ? current : undefined;
    }

    /**
     * Report every mutation inside `callback` whose target was captured outside it. Calling a mutating
     * method directly on an outer binding (`items.push()`) is left alone: that shape is overwhelmingly a
     * plain local collection, whereas reaching *into* a captured object (`history.versions.push()`,
     * `stored.status = …`) is the pattern that only works while the change context is ambient.
     */
    function reportOuterMutations(callback) {
      // Every name bound anywhere inside the callback: its parameters, and any declaration in its body
      // or in a function nested in it. Collecting them all rather than resolving scopes is deliberately
      // conservative — a name bound in a sibling scope suppresses the report instead of misattributing
      // it — and it does not depend on the linter host exposing scope analysis.
      const bound = new Set();

      const bindPattern = (pattern) => {
        if (!pattern || typeof pattern !== 'object') {
          return;
        }
        switch (pattern.type) {
          case 'Identifier':
            bound.add(pattern.name);
            break;
          case 'ObjectPattern':
            pattern.properties.forEach((property) => bindPattern(property.value ?? property.argument));
            break;
          case 'ArrayPattern':
            pattern.elements.forEach(bindPattern);
            break;
          case 'AssignmentPattern':
            bindPattern(pattern.left);
            break;
          case 'RestElement':
            bindPattern(pattern.argument);
            break;
          default:
            break;
        }
      };

      const collectBindings = (node) => {
        if (!node || typeof node !== 'object' || !node.type) {
          return;
        }
        if (node.type === 'VariableDeclarator') {
          bindPattern(node.id);
        } else if (node.type === 'FunctionDeclaration' || node.type === 'ClassDeclaration') {
          bindPattern(node.id);
          node.params?.forEach(bindPattern);
        } else if (node.type === 'ArrowFunctionExpression' || node.type === 'FunctionExpression') {
          node.params?.forEach(bindPattern);
        } else if (node.type === 'CatchClause') {
          bindPattern(node.param);
        }
        for (const key of Object.keys(node)) {
          if (key === 'parent') {
            continue;
          }
          const child = node[key];
          if (Array.isArray(child)) {
            child.forEach(collectBindings);
          } else if (child && typeof child === 'object' && child.type) {
            collectBindings(child);
          }
        }
      };

      callback.params.forEach(bindPattern);
      collectBindings(callback.body);

      const isOuter = (identifier) => !bound.has(identifier.name);

      const seen = new Set();
      const report = (target, chainDepth) => {
        const base = baseIdentifier(target);
        if (!base || chainDepth < 1 || seen.has(base) || !isOuter(base)) {
          return;
        }
        seen.add(base);
        context.report({ node: base, messageId: 'outerMutation', data: { name: base.name } });
      };

      const chainDepthOf = (node) => {
        let depth = 0;
        let current = node;
        while (current?.type === 'MemberExpression') {
          depth += 1;
          current = current.object;
        }
        return depth;
      };

      function walk(node) {
        if (!node || typeof node !== 'object' || !node.type) {
          return;
        }

        if (node.type === 'AssignmentExpression' && node.left.type === 'MemberExpression') {
          report(node.left, chainDepthOf(node.left));
        } else if (node.type === 'UpdateExpression' && node.argument.type === 'MemberExpression') {
          report(node.argument, chainDepthOf(node.argument));
        } else if (
          node.type === 'UnaryExpression' &&
          node.operator === 'delete' &&
          node.argument.type === 'MemberExpression'
        ) {
          report(node.argument, chainDepthOf(node.argument));
        } else if (
          node.type === 'CallExpression' &&
          node.callee.type === 'MemberExpression' &&
          !node.callee.computed &&
          node.callee.property.type === 'Identifier' &&
          MUTATING_METHODS.has(node.callee.property.name)
        ) {
          report(node.callee.object, chainDepthOf(node.callee.object));
        }

        for (const key of Object.keys(node)) {
          if (key === 'parent') {
            continue;
          }
          const child = node[key];
          if (Array.isArray(child)) {
            child.forEach(walk);
          } else if (child && typeof child === 'object' && child.type) {
            walk(child);
          }
        }
      }

      walk(callback.body);
    }

    return {
      CallExpression(node) {
        const { callee } = node;

        if (
          callee.type !== 'MemberExpression' ||
          callee.object.type !== 'Identifier' ||
          !['Obj', 'Relation', 'Entity'].includes(callee.object.name) ||
          callee.property.type !== 'Identifier' ||
          callee.property.name !== 'update'
        ) {
          return;
        }

        const args = node.arguments;
        if (args.length < 2) {
          return;
        }

        const firstArg = args[0];
        const callback = args[1];

        if (callback.type !== 'ArrowFunctionExpression' && callback.type !== 'FunctionExpression') {
          return;
        }

        // A callback that takes nothing can only reach the object by the name it has outside, which is
        // the read-only reference. Declaring the parameter under that same name shadows it, so the body
        // keeps reading as written while every reference in it now resolves to the mutable one.
        if (callback.params.length === 0) {
          if (firstArg.type !== 'Identifier') {
            context.report({
              node: callback,
              messageId: 'unnameableTarget',
              data: { caller: callee.object.name },
            });
            return;
          }

          context.report({
            node: callback,
            messageId: 'missingParam',
            data: { firstArg: firstArg.name, caller: callee.object.name },
            fix(fixer) {
              const sourceCode = context.sourceCode ?? context.getSourceCode();
              const tokens = sourceCode.getTokens(callback);
              const open = tokens.findIndex((token) => token.type === 'Punctuator' && token.value === '(');
              if (open === -1 || tokens[open + 1]?.value !== ')') {
                return null;
              }
              return fixer.replaceTextRange([tokens[open].range[1], tokens[open + 1].range[0]], firstArg.name);
            },
          });
          return;
        }

        reportOuterMutations(callback);

        if (firstArg.type !== 'Identifier') {
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
