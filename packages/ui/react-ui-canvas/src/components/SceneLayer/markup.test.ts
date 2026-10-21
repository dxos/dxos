//
// Copyright 2026 DXOS.org
//

import { renderToStaticMarkup } from 'react-dom/server';
import { describe, test } from 'vitest';

import { SvgFile } from '@dxos/diagram';

import { renderMarkup } from './markup.ts';

describe('renderMarkup', () => {
  test('React writes the diagram renderer markup back exactly as the SVG file holds it', ({ expect }) => {
    const objects = [
      {
        id: 'group',
        elements: [
          {
            kind: 'rect' as const,
            id: 'frame',
            x: 0,
            y: 0,
            w: 320,
            h: 200,
            fill: 'tint' as const,
            color: 'light-blue' as const,
            stroke: 'dashed' as const,
          },
          {
            kind: 'text' as const,
            id: 'title',
            x: 16,
            y: 3,
            text: 'Storage & <cache>',
            weight: 's' as const,
            color: 'grey' as const,
          },
        ],
      },
      {
        id: 'edges',
        elements: [
          {
            kind: 'line' as const,
            id: 'a-b-path',
            points: [
              { x: 40, y: 40 },
              { x: 40, y: 120 },
            ],
          },
          {
            kind: 'arrow' as const,
            id: 'a-b',
            start: { x: 40, y: 120 },
            end: { x: 200, y: 120 },
            relation: 'composition' as const,
          },
        ],
      },
    ];
    const tree = SvgFile.sceneTree(objects);
    expect(renderToStaticMarkup(renderMarkup(tree))).toBe(SvgFile.sceneMarkup(objects));
  });
});
