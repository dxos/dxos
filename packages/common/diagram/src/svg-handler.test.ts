//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { type ContentMap, applyCommands } from './content.ts';
import { SvgHandler } from './svg-handler.ts';

describe('svg-handler', () => {
  test('round-trips the object ref, including through upsert-elements', ({ expect }) => {
    const content: ContentMap = {};
    applyCommands(
      content,
      [
        {
          op: 'upsert-object',
          object: {
            id: 'Echo',
            origin: { x: 0, y: 0 },
            ref: 'packages/core/echo',
            elements: [{ kind: 'rect', id: 'box', x: 0, y: 0, w: 64, h: 32 }],
          },
        },
        // Elements alone carry no ref; the object's existing records supply it.
        {
          op: 'upsert-elements',
          objectId: 'Echo',
          elements: [{ kind: 'text', id: 'note', x: 0, y: 40, text: 'db' }],
        },
      ],
      SvgHandler,
    );

    const { scene } = SvgHandler.read(content);
    const echo = scene.objects.find(({ id }) => id === 'Echo');
    expect(echo?.ref).toBe('packages/core/echo');
    expect(echo?.elements.map(({ id }) => id)).toEqual(['box', 'note']);
  });

  test('round-trips the fractional index and reads objects in index order', ({ expect }) => {
    const content: ContentMap = {};
    const rect = { kind: 'rect', id: 'box', x: 0, y: 0, w: 64, h: 32 } as const;
    applyCommands(
      content,
      [
        { op: 'upsert-object', object: { id: 'top', origin: { x: 0, y: 0 }, index: 'a2', elements: [rect] } },
        { op: 'upsert-object', object: { id: 'plain', origin: { x: 0, y: 0 }, elements: [rect] } },
        { op: 'upsert-object', object: { id: 'bottom', origin: { x: 0, y: 0 }, index: 'a1', elements: [rect] } },
        // Elements alone carry no index; the object's existing records supply it.
        { op: 'upsert-elements', objectId: 'top', elements: [{ kind: 'text', id: 'note', x: 0, y: 40, text: 'z' }] },
      ],
      SvgHandler,
    );

    const { scene } = SvgHandler.read(content);
    expect(scene.objects.map(({ id, index }) => [id, index])).toEqual([
      ['plain', undefined],
      ['bottom', 'a1'],
      ['top', 'a2'],
    ]);
  });

  test('stores portals and arrow ports verbatim', ({ expect }) => {
    const content: ContentMap = {};
    const elements = [
      { kind: 'portal', id: 'child', x: 0, y: 0, w: 128, h: 96, ref: 'dxn:echo:@:abc' },
      { kind: 'arrow', id: 'link', from: 'child#east', to: 'other/box#west' },
    ] as const;
    applyCommands(content, [{ op: 'upsert-object', object: { id: 'root', elements } }], SvgHandler);

    const { scene } = SvgHandler.read(content);
    expect(scene.objects[0]?.elements).toEqual(elements);
  });
});
