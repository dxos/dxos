//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { DSL, GridEngine } from '@dxos/diagram';

import { DIAGRAMS, SLIDES, STUDIO_PAGE, diagramCommands, diagramPage, diagramTitle, slideTitle } from './deck.ts';

describe('the studio deck', () => {
  test('names each diagram once, and each slide once but the cover', ({ expect }) => {
    const diagrams = DIAGRAMS.map(({ id }) => id);
    expect(diagrams.length).toBeGreaterThan(0);
    expect(new Set(diagrams).size).toBe(diagrams.length);

    // The cover opens the deck and closes it; no other slide is shown twice.
    const slides = SLIDES.map(({ id }) => id);
    expect(slides.at(0)).toBe('cover');
    expect(slides.at(-1)).toBe('cover');
    const between = slides.slice(1, -1);
    expect(between).not.toContain('cover');
    expect(new Set(between).size).toBe(between.length);
  });

  test('embeds every diagram on one slide, and no diagram it does not have', ({ expect }) => {
    const embedded = SLIDES.flatMap(({ markdown }) =>
      [...markdown.matchAll(/\{\{([a-z-]+)\}\}/g)].map(([, diagram]) => diagram),
    );
    expect([...embedded].sort()).toEqual(DIAGRAMS.map(({ id }) => id).sort());
  });

  test('gives every slide a title, and a drawing the title of the slide that shows it', ({ expect }) => {
    for (const slide of SLIDES) {
      expect(slideTitle(slide).length).toBeGreaterThan(0);
      expect(slideTitle(slide)).not.toBe(slide.id);
    }
    for (const { id } of DIAGRAMS) {
      const slide = SLIDES.find(({ markdown }) => markdown.includes(`{{${id}}}`));
      expect(diagramTitle(id)).toBe(slide && slideTitle(slide));
    }
  });

  describe.each(DIAGRAMS)('$id', (diagram) => {
    const scene = () => DSL.toScene(diagramCommands(diagram));

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
      // Not the same text: a diagram is edited by hand, and the print orders attributes its own way. What must
      // hold is that one read back out of its drawing, as the DSL companion shows it, is still that drawing.
      const [object] = scene().objects;
      const { text, reasons } = DSL.printIntent({ objects: [object] });
      expect(reasons).toBeUndefined();
      const { commands, problems } = DSL.parse(text ?? '');
      expect(problems.filter(({ severity }) => severity === 'error')).toEqual([]);
      expect(GridEngine.drawn(DSL.toScene(commands).objects[0])).toEqual(GridEngine.drawn(object));
    });

    test("states no geometry but its page, which is the deck's height and at least its width", ({ expect }) => {
      const page = diagramPage(diagram);
      expect(diagram.source.match(/\d+,\d+/g) ?? []).toEqual([]);
      expect(diagram.source.match(/\b\d+x\d+\b/g)).toEqual([`${page.width}x${page.height}`]);
      expect(page.height).toBe(STUDIO_PAGE.height);
      expect(page.width).toBeGreaterThanOrEqual(STUDIO_PAGE.width);
    });
  });
});
