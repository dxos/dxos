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

    test('reads back as text that draws the same', ({ expect }) => {
      // Not the same text: a slide is edited by hand, and the print orders attributes its own way. What must hold
      // is that a slide read back out of its drawing, as the DSL companion shows it, is still that drawing.
      const [object] = scene().objects;
      const { text, reasons } = Dsl.printIntent({ objects: [object] });
      expect(reasons).toBeUndefined();
      const { commands, problems } = Dsl.parse(text ?? '');
      expect(problems.filter(({ severity }) => severity === 'error')).toEqual([]);
      expect(GridEngine.drawn(Dsl.toScene(commands).objects[0])).toEqual(GridEngine.drawn(object));
    });

    test('states no geometry but its page', ({ expect }) => {
      expect(slide.source.match(/\d+,\d+/g) ?? []).toEqual([]);
      expect(slide.source.match(/\b\d+x\d+\b/g)).toEqual([`${STUDIO_PAGE.width}x${STUDIO_PAGE.height}`]);
    });
  });
});
