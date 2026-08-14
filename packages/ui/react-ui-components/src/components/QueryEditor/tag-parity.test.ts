//
// Copyright 2026 DXOS.org
//

import { EditorState } from '@codemirror/state';
import { EditorView } from '@codemirror/view';
import { describe, expect, test } from 'vitest';

import { Tag } from '@dxos/echo';

import { query } from './query-extension';

const tags: Tag.Map = { tag_1: Tag.make({ label: 'important' }) };

/** Classes of the chip's three parts, innermost outwards: [container, `#` badge, label]. */
const chipClasses = (doc: string): string[][] => {
  const parent = document.createElement('div');
  document.body.appendChild(parent);
  const view = new EditorView({ state: EditorState.create({ doc, extensions: [query({ tags })] }), parent });
  const spans = [...view.contentDOM.querySelectorAll('span')].filter((span) => span.className.includes('orange'));
  const classes = spans.map((span) => span.className.split(/\s+/).filter(Boolean).sort());
  view.destroy();
  return classes;
};

/**
 * A tag being typed is drawn with marks over live text; a finished one is a widget replacing it. They
 * are the same chip, so every class must agree — nothing is excluded. A drift here shows up as the tag
 * changing shape under the caret the moment the terminating space arrives.
 */
describe('tag chip parity', () => {
  test('the finished and in-progress forms have the same three parts', () => {
    expect(chipClasses('#important ')).toHaveLength(3);
    expect(chipClasses('#important')).toHaveLength(3);
  });

  test('every part carries identical classes, layout included', () => {
    expect(chipClasses('#important')).toEqual(chipClasses('#important '));
  });

  test('the hue is shared, so the colour does not jump on the terminating space', () => {
    const finished = chipClasses('#important ').flat();
    const typing = chipClasses('#important').flat();
    for (const name of ['bg-orange-bg', 'bg-orange-surface', 'border-orange-border']) {
      expect(finished).toContain(name);
      expect(typing).toContain(name);
    }
  });
});
