//
// Copyright 2026 DXOS.org
//

import * as Schema from 'effect/Schema';
import { describe, test } from 'vitest';

import { nodeBase } from '@dxos/scene';

import { ViewBuilder } from '../builder/index.ts';
import { defaultNodeRegistry } from '../components/index.ts';
import { CLASSIC_LOOK, type NodeRegistry } from '../model/index.ts';
import {
  fieldName,
  fieldValue,
  fieldValues,
  isMultiline,
  nodeParts,
  nodeTitle,
  partText,
  partValues,
} from './parts.ts';
import { cornerRadius, frameClasses, hueClasses, resolveStyle, textColor } from './style.ts';

// These pin the canvas's original classes, so they draw in its classic look rather than the default theme's.
const classicFrame = (node: Parameters<typeof frameClasses>[0], selected: boolean, hovered = false) =>
  frameClasses(node, selected, hovered, false, CLASSIC_LOOK);

describe('parts', () => {
  const box = { x: 0, y: 0, width: 256, height: 128 };
  // A host kind with a list part, the way a contributed kind declares its text.
  const ListNode = Schema.Struct({
    kind: Schema.Literal('list'),
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
    views: [{ nodes }],
  } = ViewBuilder.view('s', [
    ViewBuilder.rect('r', box),
    ViewBuilder.note('n', box),
    ViewBuilder.node('list', 'l', box).properties({ title: 'Todo', items: ['buy milk'] }),
  ]).build(registry);
  const rect = nodes.r;
  const note = nodes.n;
  const list = nodes.l;

  test("reads a part as text and writes it back as the node property, by the kind's declared parts", ({ expect }) => {
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

  test("a kind's own field is named under data, and written beside the rest of the node's data", ({ expect }) => {
    // A plugin kind as the engine draws one: its fields under `data`, its parts naming them there.
    const kinds: NodeRegistry = {
      ...registry,
      list: { ...registry.list, parts: [{ field: 'data.title' }, { field: 'data.items', lines: true }] },
    };
    const node = { ...rect, kind: 'list', data: { title: 'Todo', items: ['buy milk'], done: 1 } };
    expect(partText(kinds, node, 'data.items')).toBe('buy milk');
    expect(nodeTitle(kinds, node)).toBe('Todo');
    expect(partValues(kinds, node, 'data.items', 'a\n b')).toEqual({
      data: { title: 'Todo', items: ['a', 'b'], done: 1 },
    });
    expect(fieldValue(node, 'data.done')).toBe(1);
    expect(fieldValue(node, 'data.missing')).toBeUndefined();
    // A node with no data yet gets one.
    expect(fieldValues(rect, 'data.title', 'New')).toEqual({ data: { title: 'New' } });
    expect(fieldValues(rect, 'label', 'New')).toEqual({ label: 'New' });
    expect([fieldName('data.items'), fieldName('label')]).toEqual(['items', 'label']);
  });

  test('lists and bodies are multi-line; labels are not', ({ expect }) => {
    const [label] = nodeParts(registry, rect);
    const [body] = nodeParts(registry, note);
    const [, items] = nodeParts(registry, list);
    expect([isMultiline(label), isMultiline(body), isMultiline(items)]).toEqual([false, true, true]);
  });

  test('frame classes follow the style', ({ expect }) => {
    expect(classicFrame(rect, false)).toEqual(['bg-base-surface', '', 'border-separator', '', 'rounded-sm']);
    expect(classicFrame(rect, true)[2]).toBe('border-focus');
    expect(classicFrame(rect, false, true)[2]).toBe('border-focus/50');
    const styled = {
      ...rect,
      overrides: { color: 'teal', corners: 'all', fill: 'none', stroke: 'none' } as const,
    };
    expect(classicFrame(styled, false)).toEqual(['', 'text-teal-fg', 'border-transparent', '', 'rounded-2xl']);
    // A text colour of its own wins over the hue's, and leaves the fill and the border the hue's.
    const coloured = { ...rect, overrides: { color: 'teal', textColor: 'red' } };
    expect(classicFrame(coloured, false)[1]).toBe('text-red-500');
    expect(classicFrame(coloured, false)[2]).toBe(classicFrame({ ...rect, overrides: { color: 'teal' } }, false)[2]);
    // Its tone runs light to dark; unset, it is the middle one.
    const toned = (textTone: 1 | 2 | 3) =>
      classicFrame({ ...rect, overrides: { textColor: `blue/${textTone}` } }, false)[1];
    expect([toned(1), toned(2), toned(3)]).toEqual(['text-blue-300', 'text-blue-500', 'text-blue-700']);
    expect(classicFrame({ ...rect, overrides: { textColor: 'blue' } }, false)[1]).toBe(toned(2));
    // A name that is no style hue colours nothing.
    expect(textColor('nope')).toBeUndefined();
    expect(textColor(undefined)).toBeUndefined();
    // A guide is dashed and unfilled whatever fill and stroke say.
    const guide = { ...rect, overrides: { guide: true, stroke: 'none' } as const };
    expect(classicFrame(guide, false)).toEqual(['', '', 'border-separator', 'border-dashed', 'rounded-sm']);
  });

  test('a scene shape showing its contents is opaque even in outline', ({ expect }) => {
    const { views } = ViewBuilder.view('s', [
      ViewBuilder.view('open')
        .at(box)
        .properties({ overrides: { color: 'green/0' } }),
      ViewBuilder.view('closed')
        .at(box)
        .properties({ label: 'Closed', overrides: { color: 'green/0' } }),
    ]).build();
    expect(classicFrame(views[0].nodes.open, false)[0]).toBe('bg-base-surface');
    expect(classicFrame(views[0].nodes.closed, false)[0]).toBe('bg-transparent');
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

  test('an unset fill or corner resolves to drawn, and the stroke is left as stated', ({ expect }) => {
    expect(resolveStyle(undefined)).toEqual({ fill: 'solid', corners: 'all' });
    expect(resolveStyle({ color: 'orange' })).toEqual({ color: 'orange', fill: 'solid', corners: 'all' });
    expect(resolveStyle({ fill: 'none', stroke: 'none', corners: 'none' })).toEqual({
      fill: 'none',
      stroke: 'none',
      corners: 'none',
    });
  });

  test("the corners' states always differ: none is square, any other the look's rounded corner", ({ expect }) => {
    const tokens = { radius: 'sm', roundedRadius: '2xl' } as const;
    expect(cornerRadius({ corners: 'none' }, tokens)).toBe('none');
    expect(cornerRadius({ corners: 'all' }, tokens)).toBe('2xl');
    expect(cornerRadius({ corners: 'top' }, tokens)).toBe('2xl');
    expect(cornerRadius(undefined, tokens)).toBe('sm');
  });
});
