//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { Dsl, GridEngine } from '@dxos/diagram';

import { STUDIO_PAGE, STUDIO_SLIDES, slideCommands } from './deck.ts';

describe('the studio deck', () => {
  test('is nine slides, each its own', ({ expect }) => {
    expect(STUDIO_SLIDES).toHaveLength(9);
    expect(new Set(STUDIO_SLIDES.map(({ id }) => id)).size).toBe(9);
  });

  describe.each(STUDIO_SLIDES)('$id', (slide) => {
    const scene = () => Dsl.toScene(slideCommands(slide));

    test('draws one object whose connectors all end on something drawn', ({ expect }) => {
      const { objects } = scene();
      expect(objects).toHaveLength(1);
      const drawn = GridEngine.drawn(objects[0]);
      expect(drawn.leaves.length).toBeGreaterThan(0);
      for (const { fromFrame, toFrame } of drawn.arrows) {
        expect(fromFrame).toBeDefined();
        expect(toFrame).toBeDefined();
      }
    });

    test('is the text its own drawing prints', ({ expect }) => {
      // So a slide edited on the canvas and read back is the file again, and a hand edit that the print would
      // reorder shows here rather than as a diff the next time someone saves.
      expect(Dsl.printIntent(scene())).toEqual({ text: slide.source });
    });

    test('states no geometry but its page', ({ expect }) => {
      expect(slide.source.match(/\d+,\d+/g) ?? []).toEqual([]);
      expect(slide.source.match(/\b\d+x\d+\b/g)).toEqual([`${STUDIO_PAGE.width}x${STUDIO_PAGE.height}`]);
    });
  });
});
