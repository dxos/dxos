//
// Copyright 2026 DXOS.org
//

import { CompletionContext, type CompletionResult } from '@codemirror/autocomplete';
import { EditorState } from '@codemirror/state';
import { describe, expect, test } from 'vitest';

import { LAYOUTS } from '#markdown';

import { slideCompletion } from './slide-completion.ts';

const complete = async (marked: string, explicit = false): Promise<CompletionResult | null> => {
  const pos = marked.indexOf('|');
  const state = EditorState.create({
    doc: marked.replace('|', ''),
    extensions: slideCompletion({ describeLayout: (layout) => `[${layout}]` }),
  });
  const [source] = state.languageDataAt<(context: CompletionContext) => CompletionResult | null>('autocomplete', pos);
  return source ? source(new CompletionContext(state, pos, explicit)) : null;
};

describe('slideCompletion', () => {
  test('offers the matching layouts with their names', async () => {
    const result = await complete('---\nlayout: q|\n---\n');
    expect(result?.options.map(({ label, detail }) => `${label} ${detail}`)).toEqual(['quote [quote]']);
  });

  test('the provider returns the same source each time, which the completion plugin matches results by', () => {
    const state = EditorState.create({
      doc: '---\nlayout: \n---\n',
      extensions: slideCompletion({ describeLayout: String }),
    });
    expect(state.languageDataAt('autocomplete', 12)[0]).toBe(state.languageDataAt('autocomplete', 12)[0]);
  });

  test('opens on an empty value right after the colon', async () => {
    expect((await complete('---\nlayout: |\n---\n'))?.options).toHaveLength(LAYOUTS.length);
  });
});
