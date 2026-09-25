//
// Copyright 2026 DXOS.org
//

/**
 * Disallow the `tailwindcss-logical` dialect, dropped in the Tailwind v4 migration (#10611).
 *
 * These classes compile to nothing: no error, no warning, no rule in the stylesheet. The layout is
 * merely wrong, and when the dead class was load-bearing — a `min-bs-*` reserving height, a
 * `min-is-0` letting a grid child shrink — the failure surfaces far from its cause.
 *
 * @example
 * // ❌ Bad
 * <div className='pis-2 min-bs-[2rem] is-full' />
 *
 * // ✅ Good
 * <div className='ps-2 min-h-[2rem] w-full' />
 */

/** Dead prefix → what Tailwind v4 actually ships. */
const REPLACEMENTS = {
  'pis': 'ps',
  'pie': 'pe',
  'pbs': 'pt',
  'pbe': 'pb',
  'pli': 'px',
  'plb': 'py',
  'mis': 'ms',
  'mie': 'me',
  'mbs': 'mt',
  'mbe': 'mb',
  'mli': 'mx',
  'mlb': 'my',
  'is': 'w',
  'bs': 'h',
  'min-is': 'min-w',
  'min-bs': 'min-h',
  'max-is': 'max-w',
  'max-bs': 'max-h',
  'border-is': 'border-s',
  'border-ie': 'border-e',
  'border-bs': 'border-t',
  'border-be': 'border-b',
};

// Longest first, so `min-is-0` is not matched as `is-0` with a `min-` prefix left over.
const PREFIXES = Object.keys(REPLACEMENTS).sort((a, b) => b.length - a.length);

/**
 * The dead prefix in a class, if any. Variants (`hover:`, `md:`, `[&_p]:`) are stripped first, and a
 * value is required — `bs-4`, `is-[20rem]`, `min-bs-full` — so identifiers that merely start with
 * these letters (`isolate`, `bg-inputSurface`) are left alone.
 */
const deadPrefix = (className) => {
  const base = className.slice(className.lastIndexOf(':') + 1).replace(/^-/, '');
  return PREFIXES.find((prefix) => new RegExp(`^${prefix}-(?:\\[|[\\w.]|full$|auto$|px$)`).test(base));
};

/** Class-bearing attributes and helpers. `mx()` is this repo's class merger. */
const ATTRIBUTES = new Set(['className', 'classNames', 'class']);

export default {
  meta: {
    type: 'problem',
    docs: {
      description: 'disallow tailwindcss-logical classes, which compile to nothing since Tailwind v4',
      category: 'Possible Errors',
      recommended: true,
    },
    fixable: 'code',
    schema: [],
    messages: {
      deadClass: '`{{className}}` compiles to nothing (tailwindcss-logical was dropped). Use `{{suggestion}}`.',
    },
  },
  create: (context) => {
    // A literal inside `mx()` inside a `classNames` attribute matches two of the selectors below.
    const seen = new Set();

    /** Report each dead class inside a string literal, fixing the prefix in place. */
    const checkLiteral = (node) => {
      if (seen.has(node)) {
        return;
      }
      seen.add(node);

      const value = node.value;
      if (typeof value !== 'string' || !value.length) {
        return;
      }

      for (const className of value.split(/\s+/).filter(Boolean)) {
        const prefix = deadPrefix(className);
        if (!prefix) {
          continue;
        }

        const suggestion = className.replace(
          new RegExp(`(^|:)-?${prefix}-`),
          (match, variant) => `${variant}${REPLACEMENTS[prefix]}-`,
        );

        context.report({
          node,
          messageId: 'deadClass',
          data: { className, suggestion },
          fix: (fixer) => fixer.replaceText(node, node.raw.split(className).join(suggestion)),
        });
      }
    };

    /** Only strings that are actually classes: a JSX class attribute, or an argument to `mx()`. */
    return {
      'JSXAttribute > Literal': (node) => {
        if (ATTRIBUTES.has(node.parent.name?.name)) {
          checkLiteral(node);
        }
      },
      'JSXAttribute JSXExpressionContainer Literal': (node) => {
        const attribute = context.sourceCode
          .getAncestors(node)
          .findLast((ancestor) => ancestor.type === 'JSXAttribute');
        if (attribute && ATTRIBUTES.has(attribute.name?.name)) {
          checkLiteral(node);
        }
      },
      'CallExpression[callee.name="mx"] Literal': checkLiteral,
    };
  },
};
