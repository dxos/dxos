//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { type ContentMap, applyCommands } from './content';
import { SvgHandler } from './svg-handler';

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
});
