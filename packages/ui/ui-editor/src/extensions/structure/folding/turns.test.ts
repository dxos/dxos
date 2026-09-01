//
// Copyright 2026 DXOS.org
//

import { EditorState } from '@codemirror/state';
import { describe, test } from 'vitest';

import { PROMPT_ELEMENT, createTurnSource } from './turns.ts';

describe('createTurnSource', () => {
  test('folds the response below a prompt', ({ expect }) => {
    const turns = scan(['<prompt>Hi</prompt>', 'Answer.'].join('\n'));
    expect(turns).toHaveLength(1);
    expect(turns[0].head).toBe('<prompt>Hi</prompt>');
    expect(turns[0].folded).toBe('Answer.');
  });

  test('anchors the gutter marker on the first line of a multi-line head', ({ expect }) => {
    const doc = ['<prompt>line one', 'line two</prompt>', 'Answer.'].join('\n');
    const turns = scan(doc);
    expect(turns[0].headLine).toBe(0);
    expect(turns[0].folded).toBe('Answer.');
  });

  // A toolbar rendered under the prompt belongs to the head: folding the response must not hide the
  // control that folds it.
  test('keeps a trailing self-closing toolbar tag out of the fold range', ({ expect }) => {
    const doc = ['<prompt>Hi</prompt>', '', '<branch messageId="a" created="t" />', 'Answer.'].join('\n');
    const turns = scan(doc);
    expect(turns).toHaveLength(1);
    expect(turns[0].head).toContain('<branch');
    expect(turns[0].folded).toBe('Answer.');
    // The marker still sits on the prompt, not on the toolbar.
    expect(turns[0].headLine).toBe(0);
  });

  test('absorbs several trailing self-closing tags', ({ expect }) => {
    const doc = ['<prompt>Hi</prompt>', '<branch messageId="a" />', '<other />', 'Answer.'].join('\n');
    const turns = scan(doc);
    expect(turns[0].folded).toBe('Answer.');
  });

  test('does not absorb a paired tag that opens the response', ({ expect }) => {
    const doc = ['<prompt>Hi</prompt>', '<reasoning>Thinking</reasoning>', 'Answer.'].join('\n');
    const turns = scan(doc);
    expect(turns[0].head).toBe('<prompt>Hi</prompt>');
    expect(turns[0].folded).toBe(['<reasoning>Thinking</reasoning>', 'Answer.'].join('\n'));
  });

  test('ends a turn where the next prompt begins, trailing whitespace trimmed', ({ expect }) => {
    const doc = ['<prompt>One</prompt>', 'First.', '', '<prompt>Two</prompt>', 'Second.', ''].join('\n');
    const turns = scan(doc);
    expect(turns).toHaveLength(2);
    expect(turns[0].folded).toBe('First.');
    expect(turns[1].folded).toBe('Second.');
  });

  test('yields no turn for a prompt with an empty response', ({ expect }) => {
    expect(scan('<prompt>Hi</prompt>')).toHaveLength(0);
    expect(scan(['<prompt>Hi</prompt>', '<branch messageId="a" />'].join('\n'))).toHaveLength(0);
  });
});

/** Resolves each turn into the text it treats as head vs. the text it would hide. */
const scan = (doc: string) => {
  const state = EditorState.create({ doc });
  return createTurnSource(PROMPT_ELEMENT)(state).map((turn) => ({
    head: state.doc.sliceString(turn.headLineFrom, turn.from).trim(),
    folded: state.doc.sliceString(turn.from, turn.to).trim(),
    headLine: state.doc.lineAt(turn.headLineFrom).number - 1,
  }));
};
