//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { SceneBuilder } from './builder.ts';
import { isMultiline, partKey, partText, partValues } from './parts.ts';
import { frameClasses } from './style.ts';

describe('parts', () => {
  const box = { x: 0, y: 0, width: 256, height: 128 };
  const { nodes } = SceneBuilder.create('s').rect('r', box).class('c', box, 'Person', ['name: string']).build();
  const rect = nodes.r;
  const cls = nodes.c;

  test('reads a part as text and writes it back as the node property', ({ expect }) => {
    expect(partText(rect, 'label')).toBe('');
    expect(partText(rect, 'name')).toBeUndefined();
    expect(partText(cls, 'attributes')).toBe('name: string');
    expect(partValues(rect, 'label', 'A')).toEqual({ label: 'A' });
    expect(partValues(cls, 'attributes', 'a: string\n\n b: number \n')).toEqual({
      attributes: ['a: string', 'b: number'],
    });
    expect(partValues(cls, 'name', ' Org ')).toEqual({ name: 'Org' });
    expect(partValues(rect, 'methods', 'x')).toBeUndefined();
  });

  test('lists and bodies are multi-line; labels and names are not', ({ expect }) => {
    expect(isMultiline('attributes')).toBe(true);
    expect(isMultiline('text')).toBe(true);
    expect(isMultiline('label')).toBe(false);
    expect(partKey('label')).toBe('label');
    expect(partKey('other')).toBeUndefined();
  });

  test('frame classes follow the style', ({ expect }) => {
    expect(frameClasses(rect, false)).toEqual(['bg-base-surface', '', 'border-separator', '', 'rounded-sm', '']);
    expect(frameClasses(rect, true)[2]).toBe('border-primary-500');
    expect(frameClasses(rect, false, true)[2]).toBe('border-primary-500/50');
    const styled = { ...rect, style: { hue: 'teal', rounded: true, fill: false, border: false } };
    expect(frameClasses(styled, false)).toEqual(['', 'text-teal-fg', 'border-transparent', '', 'rounded-2xl', '']);
    // A guide is dashed and unfilled whatever fill and border say; the host's class comes last.
    const guide = { ...rect, style: { guide: true, border: false, className: 'shadow' } };
    expect(frameClasses(guide, false)).toEqual(['', '', 'border-separator', 'border-dashed', 'rounded-sm', 'shadow']);
  });
});
