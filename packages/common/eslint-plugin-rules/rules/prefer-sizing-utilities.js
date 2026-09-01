//
// Copyright 2026 DXOS.org
//

/**
 * Prefer the `dx-*` sizing utilities over hand-rolled Tailwind equivalents.
 *
 * The repo accumulated ~140 hand-rolled spellings of three intents — `flex-1 min-h-0`,
 * `grow min-w-0 min-h-0`, `h-full w-full` — which read as arbitrary combinations rather than as a
 * decision about how the parent sizes the element. The utilities name the intent, so a reader does
 * not have to reconstruct it from the properties.
 *
 * Also flags a sizing utility stacked on top of what it already applies.
 *
 * @example
 * // ❌ Bad
 * <div className='flex-1 min-h-0 min-w-0' />
 * <div className='h-full w-full' />
 * <div className='dx-expand h-full' />
 *
 * // ✅ Good
 * <div className='dx-grow' />
 * <div className='dx-fill' />
 * <div className='dx-expand' />
 * <div className='[&>svg]:w-full [&>svg]:h-full' />
 */

/** What each utility already applies. */
const UTILITIES = {
  'dx-fill': ['h-full', 'w-full'],
  'dx-grow': ['flex-1', 'min-h-0', 'min-w-0'],
  'dx-expand': ['flex-1', 'min-h-0', 'min-w-0', 'h-full', 'w-full'],
  'dx-fullscreen': ['absolute', 'inset-0'],
};

/**
 * Hand-rolled combinations, longest first so `flex-1 min-h-0 min-w-0` is reported as `dx-grow`
 * rather than as a partial match. `grow` is folded into `dx-grow`: it differs from `flex-1` in
 * `flex-basis` (auto vs 0), and the sites using it were not making that distinction deliberately.
 */
const COMBINATIONS = [
  { classes: ['flex-1', 'min-h-0', 'min-w-0', 'h-full', 'w-full'], suggestion: 'dx-expand' },
  { classes: ['grow', 'min-h-0', 'min-w-0', 'h-full', 'w-full'], suggestion: 'dx-expand' },
  { classes: ['flex-1', 'min-h-0', 'min-w-0'], suggestion: 'dx-grow' },
  { classes: ['grow', 'min-h-0', 'min-w-0'], suggestion: 'dx-grow' },
  { classes: ['flex-1', 'min-h-0'], suggestion: 'dx-grow' },
  { classes: ['grow', 'min-h-0'], suggestion: 'dx-grow' },
  { classes: ['h-full', 'w-full'], suggestion: 'dx-fill' },
  { classes: ['absolute', 'inset-0'], suggestion: 'dx-fullscreen' },
];

/** Utility pairs that are the long spelling of another utility. */
const COMPOSITIONS = [{ classes: ['dx-grow', 'dx-fill'], suggestion: 'dx-expand' }];

/** Any non-visible overflow already zeroes the automatic minimum size. */
const CLIPS = /^overflow(-[xy])?-(hidden|auto|scroll|clip)$/;

/** The classes that only exist to zero that same minimum. */
const MINIMUMS = ['min-h-0', 'min-w-0', 'dx-shrink'];

/** Class-bearing attributes. `mx()` is this repo's class merger. */
const ATTRIBUTES = new Set(['className', 'classNames', 'class']);

/**
 * Only unprefixed classes are considered. A variant (`hover:`, `md:`, `[&>svg]:`) retargets the
 * class — at a state, a breakpoint, or a descendant — so `[&>svg]:w-full [&>svg]:h-full` is a rule
 * about the SVG, not about this element, and the variants of a pair are not necessarily equal.
 */
const unprefixed = (className) => !className.includes(':');

export default {
  meta: {
    type: 'suggestion',
    docs: {
      description: 'prefer the dx-* sizing utilities over hand-rolled Tailwind equivalents',
      category: 'Stylistic Issues',
      recommended: true,
    },
    schema: [],
    messages: {
      handRolled: '`{{classes}}` is `{{suggestion}}`. Use the utility so the intent is explicit.',
      redundant: '`{{className}}` already applies `{{redundant}}`. Remove the duplicate.',
      minimumUnderClip:
        '`{{minimum}}` does nothing here: `{{overflow}}` already zeroes the automatic minimum size, so the element can already be smaller than its content. Remove it.',
    },
  },
  create: (context) => {
    // A literal inside `mx()` inside a `classNames` attribute matches two of the selectors below.
    const seen = new Set();

    const checkLiteral = (node) => {
      if (seen.has(node)) {
        return;
      }
      seen.add(node);

      const value = node.value;
      if (typeof value !== 'string' || !value.length) {
        return;
      }

      const classes = value.split(/\s+/).filter(Boolean);
      const present = new Set(classes.filter(unprefixed));

      // A utility stacked on top of what it already applies.
      for (const [utility, applied] of Object.entries(UTILITIES)) {
        if (!present.has(utility)) {
          continue;
        }
        const redundant = applied.filter((cls) => present.has(cls));
        if (redundant.length) {
          context.report({
            node,
            messageId: 'redundant',
            data: { className: utility, redundant: redundant.join(' ') },
          });
        }
      }

      // A minimum next to a clip. The overflow already did it, so the class is a no-op that reads
      // as though it were load-bearing — the single biggest source of confusion about `min-*-0`.
      const overflow = classes.filter(unprefixed).find((cls) => CLIPS.test(cls));
      if (overflow) {
        const minimum = MINIMUMS.find((cls) => present.has(cls));
        if (minimum) {
          context.report({ node, messageId: 'minimumUnderClip', data: { minimum, overflow } });
        }
      }

      // Two utilities that compose into a third — the long spelling of one name.
      const composition = COMPOSITIONS.find(({ classes: needed }) => needed.every((cls) => present.has(cls)));
      if (composition) {
        context.report({
          node,
          messageId: 'handRolled',
          data: { classes: composition.classes.join(' '), suggestion: composition.suggestion },
        });
      }

      // Hand-rolled equivalents. Only the first (longest) match is reported, so one class list does
      // not produce a cascade of overlapping suggestions.
      if (!Object.keys(UTILITIES).some((utility) => present.has(utility))) {
        const match = COMBINATIONS.find(({ classes: needed }) => needed.every((cls) => present.has(cls)));
        if (match) {
          context.report({
            node,
            messageId: 'handRolled',
            data: { classes: match.classes.join(' '), suggestion: match.suggestion },
          });
        }
      }
    };

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
