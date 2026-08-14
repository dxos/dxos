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
 * A tag being typed is drawn with marks over live text; a finished one is a widget. They must read as
 * the same chip, so the parts that carry its APPEARANCE — fill, surface, border, padding, type scale —
 * have to agree. Layout classes are excluded deliberately: the widget lays its parts out with flex,
 * which the mark form cannot use without moving the caret inside editable text.
 */
describe('tag chip parity', () => {
  const LAYOUT = new Set(['inline-flex', 'inline-block', 'flex', 'items-center', 'align-middle', 'leading-[24px]']);
  const appearance = (classes: string[]) => classes.filter((name) => !LAYOUT.has(name) && !/^h-\[/.test(name));

  test('the finished and in-progress forms have the same three parts', () => {
    expect(chipClasses('#important ')).toHaveLength(3);
    expect(chipClasses('#important')).toHaveLength(3);
  });

  test('every part carries identical appearance classes', () => {
    const finished = chipClasses('#important ').map(appearance);
    const typing = chipClasses('#important').map(appearance);
    expect(typing).toEqual(finished);
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
