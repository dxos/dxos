//
// Copyright 2026 DXOS.org
//

import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, test } from 'vitest';

import { Dsl, GridEngine } from '@dxos/diagram';

const here = dirname(fileURLToPath(import.meta.url));

/** Every slide, each written twice: as grid boxes (`.grid.diagram`) and as a grid diagram of intent (`.dx`). */
const SLIDES = ['agent', 'agents', 'architecture', 'chat', 'composer', 'echo', 'hyperspace', 'ontology', 'plugins'];

const sourceOf = (file: string): string => readFileSync(join(here, file), 'utf8');

/**
 * Set to re-read every `.dx` from its boxes instead of checking it: the boxes are what is edited by hand, and the
 * intent file is their reading. `DX_WRITE_INTENT=1 pnpm exec vitest run --project=node <this file>`.
 */
const WRITE_INTENT = process.env.DX_WRITE_INTENT === '1';

/** The scene a document draws, and what it shows apart from how its grids say it. */
const read = (text: string) => {
  const { commands, problems } = Dsl.parse(text);
  const scene = Dsl.toScene(commands);
  const [object] = scene.objects;
  return {
    scene,
    drawn: GridEngine.drawn(object),
    errors: problems.filter(({ severity }) => severity === 'error'),
  };
};

describe('a slide as a grid diagram', () => {
  describe.each(SLIDES)('%s', (name) => {
    test('draws what its grid boxes draw', ({ expect }) => {
      const boxes = read(sourceOf(`${name}.grid.diagram`));
      const intent = read(sourceOf(`${name}.dx`));
      expect(intent.errors).toEqual([]);
      expect(boxes.errors).toEqual([]);
      expect(intent.drawn.leaves.length).toBeGreaterThan(0);
      expect(intent.drawn).toEqual(boxes.drawn);
      for (const { fromFrame, toFrame } of intent.drawn.arrows) {
        expect(fromFrame).toBeDefined();
        expect(toFrame).toBeDefined();
      }
    });

    test('is the text its own drawing prints', ({ expect }) => {
      const text = sourceOf(`${name}.dx`);
      expect(Dsl.printIntent(read(text).scene)).toEqual({ text });
    });

    test('is what the boxes written by hand read back as', ({ expect }) => {
      const boxes = read(sourceOf(`${name}.grid.diagram`));
      const { text, reasons } = Dsl.printIntent(boxes.scene);
      expect(reasons).toBeUndefined();
      expect(read(text ?? '').drawn).toEqual(boxes.drawn);
      // The intent file is this reading and nothing else, so a change to the boxes shows here until it is re-read.
      if (WRITE_INTENT && text !== undefined) {
        writeFileSync(join(here, `${name}.dx`), text);
      }
      expect(text).toBe(sourceOf(`${name}.dx`));
    });

    test('states no geometry but its frame', ({ expect }) => {
      const text = sourceOf(`${name}.dx`);
      // The frame's size is the only geometry a grid diagram states.
      expect(text.match(/\d+,\d+/g) ?? []).toEqual([]);
      expect(text.match(/\b\d+x\d+\b/g)).toEqual(['1600x880']);
    });
  });
});
