//
// Copyright 2026 DXOS.org
//

import * as Schema from 'effect/Schema';
import { describe, test } from 'vitest';

import { type NodeRegistry, defaultNodeRegistry } from '../model/registry.ts';
import { nodeBase } from '../model/types.ts';
import { SceneBuilder } from './builder.ts';
import { isMultiline, nodeParts, nodeTitle, partText, partValues } from './parts.ts';
import { frameClasses, hueClasses, resolveStyle } from './style.ts';

describe('parts', () => {
  const box = { x: 0, y: 0, width: 256, height: 128 };
  // A host type with a list part, the way a contributed type declares its text.
  const ListNode = Schema.Struct({
    type: Schema.Literal('list'),
    ...nodeBase,
    title: Schema.String,
    items: Schema.Array(Schema.String),
  });
  const registry: NodeRegistry = {
    ...defaultNodeRegistry,
    list: {
      ...defaultNodeRegistry.rect,
      type: 'list',
      schema: ListNode,
      parts: [{ field: 'title' }, { field: 'items', lines: true }],
    },
  };
  const {
    scenes: [{ nodes }],
  } = SceneBuilder.scene('s', [
    SceneBuilder.rect('r', box),
    SceneBuilder.note('n', box),
    SceneBuilder.node('list', 'l', box).properties({ title: 'Todo', items: ['buy milk'] }),
  ]).build(registry);
  const rect = nodes.r;
  const note = nodes.n;
  const list = nodes.l;

  test("reads a part as text and writes it back as the node property, by the type's declared parts", ({ expect }) => {
    expect(partText(registry, rect, 'label')).toBe('');
    expect(partText(registry, rect, 'items')).toBeUndefined();
    expect(partText(registry, list, 'items')).toBe('buy milk');
    expect(partValues(registry, rect, 'label', 'A')).toEqual({ label: 'A' });
    expect(partValues(registry, list, 'items', 'a\n\n b \n')).toEqual({ items: ['a', 'b'] });
    expect(partValues(registry, rect, 'items', 'x')).toBeUndefined();
    // The first part is the node's main text.
    expect(nodeTitle(registry, list)).toBe('Todo');
    expect(nodeTitle(registry, note)).toBe('Note');
  });

  test('lists and bodies are multi-line; labels are not', ({ expect }) => {
    const [label] = nodeParts(registry, rect);
    const [body] = nodeParts(registry, note);
    const [, items] = nodeParts(registry, list);
    expect([isMultiline(label), isMultiline(body), isMultiline(items)]).toEqual([false, true, true]);
  });

  test('frame classes follow the style', ({ expect }) => {
    expect(frameClasses(rect, false)).toEqual(['bg-base-surface', '', 'border-separator', '', 'rounded-sm', '']);
    expect(frameClasses(rect, true)[2]).toBe('border-focus-ring-subtle');
    expect(frameClasses(rect, false, true)[2]).toBe('border-focus-ring-subtle/50');
    const styled = { ...rect, style: { hue: 'teal', rounded: true, fill: false, border: false } };
    expect(frameClasses(styled, false)).toEqual(['', 'text-teal-fg', 'border-transparent', '', 'rounded-2xl', '']);
    // A guide is dashed and unfilled whatever fill and border say; the host's class comes last.
    const guide = { ...rect, style: { guide: true, border: false, className: 'shadow' } };
    expect(frameClasses(guide, false)).toEqual(['', '', 'border-separator', 'border-dashed', 'rounded-sm', 'shadow']);
  });

  test('a scene shape showing its contents is opaque even in outline', ({ expect }) => {
    const { scenes } = SceneBuilder.scene('s', [
      SceneBuilder.scene('open')
        .at(box)
        .properties({ style: { hue: 'green', tone: 0 } }),
      SceneBuilder.scene('closed')
        .at(box)
        .properties({ label: 'Closed', style: { hue: 'green', tone: 0 } }),
    ]).build();
    expect(frameClasses(scenes[0].nodes.open, false)[0]).toBe('bg-base-surface');
    expect(frameClasses(scenes[0].nodes.closed, false)[0]).toBe('bg-transparent');
  });

  test('every tone keeps the hue border; tone 0 drops the fill, unset is tone 2', ({ expect }) => {
    expect(hueClasses('blue', 0)).toEqual({
      surface: 'bg-transparent',
      text: '',
      border: 'border-blue-border',
    });
    // Tones 1 to 3 run strongest to lightest.
    expect(hueClasses('blue', 1)).toEqual({
      surface: 'bg-blue-500',
      text: 'text-neutral-50',
      border: 'border-blue-border',
    });
    expect(hueClasses('blue')).toEqual(hueClasses('blue', 2));
    expect(hueClasses('blue', 2)).toEqual({
      surface: 'bg-blue-surface',
      text: 'text-blue-fg',
      border: 'border-blue-border',
    });
    expect(hueClasses('blue', 3)).toEqual({
      surface: 'bg-blue-300',
      text: 'text-blue-900',
      border: 'border-blue-border',
    });
    // A hue the picker does not offer draws its stronger tones as its role pair; no hue ignores the tone.
    expect(hueClasses('lime', 3)).toEqual(hueClasses('lime'));
    expect(hueClasses(undefined, 3)).toEqual(hueClasses(undefined));
  });

  test('an unset fill or border resolves to drawn', ({ expect }) => {
    expect(resolveStyle(undefined)).toEqual({ fill: true, border: true });
    expect(resolveStyle({ hue: 'orange' })).toEqual({ hue: 'orange', fill: true, border: true });
    expect(resolveStyle({ fill: false, border: false })).toEqual({ fill: false, border: false });
  });
});
