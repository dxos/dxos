//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { SceneBuilder } from './builder.ts';
import { isMultiline, partKey, partText, partValues } from './parts.ts';
import { frameClasses, hueClasses, resolveStyle } from './style.ts';

describe('parts', () => {
  const box = { x: 0, y: 0, width: 256, height: 128 };
  const {
    scenes: [{ nodes }],
  } = SceneBuilder.scene('s', [
    SceneBuilder.rect('r', box),
    SceneBuilder.class('c', box).properties({ name: 'Person', attributes: ['name: string'], methods: [] }),
  ]).build();
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

  test('every tone keeps the hue border; outline drops the fill, unset is medium', ({ expect }) => {
    expect(hueClasses('blue', 'outline')).toEqual({
      surface: 'bg-transparent',
      text: '',
      border: 'border-blue-border',
    });
    expect(hueClasses('blue', 'light')).toEqual({
      surface: 'bg-blue-200',
      text: 'text-blue-900',
      border: 'border-blue-border',
    });
    expect(hueClasses('blue')).toEqual(hueClasses('blue', 'medium'));
    expect(hueClasses('blue', 'medium')).toEqual({
      surface: 'bg-blue-surface',
      text: 'text-blue-fg',
      border: 'border-blue-border',
    });
    expect(hueClasses('blue', 'strong')).toEqual({
      surface: 'bg-blue-bg',
      text: 'text-neutral-50',
      border: 'border-blue-border',
    });
    // A hue the picker does not offer draws its stronger tones as medium; no hue ignores the tone.
    expect(hueClasses('lime', 'strong')).toEqual(hueClasses('lime'));
    expect(hueClasses(undefined, 'strong')).toEqual(hueClasses(undefined));
  });

  test('an unset fill or border resolves to drawn', ({ expect }) => {
    expect(resolveStyle(undefined)).toEqual({ fill: true, border: true });
    expect(resolveStyle({ hue: 'orange' })).toEqual({ hue: 'orange', fill: true, border: true });
    expect(resolveStyle({ fill: false, border: false })).toEqual({ fill: false, border: false });
  });
});
