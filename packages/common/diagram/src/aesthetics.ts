//
// Copyright 2026 DXOS.org
//

//
// Aesthetic rules: whether a diagram reads well as drawn, which the layout objective's counts
// (crossings, bends, length) do not capture — arrows against the flow, labels on top of boxes, edges
// merged into one trunk, an entry point in the far corner of its group. Judged from `Content.layout`,
// the text rendering of the page, by the same batched decision call as `Architecture`.
//

import * as Effect from 'effect/Effect';
import type * as DecisionModel from 'effect/unstable/ai/DecisionModel';

import * as Architecture from './architecture.ts';
import type * as Score from './score.ts';

const HOW_TO_READ =
  'The input is a diagram as drawn: `layout` renders the page as text, a character drawing followed by a ' +
  'row-by-row reading of the boxes and of which way each arrow runs. Judge how the drawing reads to a person ' +
  'looking at it, not whether the architecture it shows is good.';

const rule = (
  id: string,
  key: string,
  description: string,
  question: string,
  criteria: Architecture.Rule['criteria'],
): Architecture.Rule => ({ id, key, description, instructions: `${HOW_TO_READ} ${question}`, criteria });

export const RULES: readonly Architecture.Rule[] = [
  rule(
    'arrows-follow-flow',
    'arrowsFollowFlow',
    'Arrows run with the main direction of the diagram, inside groups as well as between them.',
    'Do the arrows run with the main direction of the diagram (down in a top-to-bottom drawing, right in a ' +
      'left-to-right one), inside groups as well as between them, with at most a few pointing back against it?',
    {
      true: 'Nearly every arrow runs with the flow; a reader follows dependencies in one direction.',
      false: 'Many arrows, or whole chains inside a group, run up or back against the flow.',
    },
  ),
  rule(
    'readable-labels',
    'readableLabels',
    'Every box and arrow label can be read on its own.',
    'Can every box label and arrow label be read on its own, without running into another label, a line or a box?',
    {
      true: 'Every label sits clear of other text and lines.',
      false: 'Some label overlaps another label, a box or a line, or is cut off.',
    },
  ),
  rule(
    'traceable-arrows',
    'traceableArrows',
    'Each arrow can be followed from its start to its end.',
    'Can a reader follow each arrow from its start to its end without ambiguity — no separate arrows merged into ' +
      'one shared trunk, no long detours around the page, and few crossings?',
    {
      true: 'Each arrow has its own short, direct route.',
      false: 'Arrows share trunks, detour far, or cross so that their ends are hard to pair up.',
    },
  ),
  rule(
    'entries-face-callers',
    'entriesFaceCallers',
    'Boxes that outside arrows reach sit on the side of their group facing the callers.',
    'Within each group, do the boxes that arrows from outside the group reach sit on the side of the group ' +
      'facing those callers, so that cross-group arrows are short and do not run through or around the group?',
    {
      true: 'Cross-group arrows land on the near side of each group.',
      false: 'An arrow from outside travels through or around a group to reach a box on its far side.',
    },
  ),
  rule(
    'balanced-space',
    'balancedSpace',
    'Space is used evenly: groups fit their content, related boxes sit together.',
    'Is the space used evenly — groups sized to what they hold, no large empty regions, and boxes that are ' +
      'connected placed near each other?',
    {
      true: 'The page is compact and evenly filled; connected boxes are neighbours.',
      false: 'There are large empty regions, stretched groups, or connected boxes far apart.',
    },
  ),
  rule(
    'aligned-grid',
    'alignedGrid',
    'Boxes line up in rows and columns with consistent spacing.',
    'Are the boxes aligned into clear rows and columns with consistent spacing, so the structure reads as a grid?',
    {
      true: 'Boxes share rows and columns with even gaps.',
      false: 'Boxes are staggered or unevenly spaced, with no clear rows or columns.',
    },
  ),
];

/**
 * Every aesthetic rule as a score from one `DecisionModel` call. Without `layout` there is nothing to
 * judge, so each rule reports an error rather than a guess.
 */
export const judge = (
  rules: readonly Architecture.Rule[] = RULES,
): Score.Batch<{ readonly content: Architecture.Content }, DecisionModel.DecisionModel> => {
  const inner = Architecture.judge(rules, 'aesthetics');
  return {
    entries: inner.entries,
    evaluate: (subject) =>
      subject.content.layout
        ? inner.evaluate(subject)
        : Effect.succeed(rules.map(() => ({ score: 0, error: 'No layout to judge.' }))),
  };
};
