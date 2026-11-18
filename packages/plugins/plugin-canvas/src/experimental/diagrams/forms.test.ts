//
// Copyright 2026 DXOS.org
//

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, test } from 'vitest';

import { Dsl } from '@dxos/diagram';
import { Shape, solveGrids } from '@dxos/scene';

const here = dirname(fileURLToPath(import.meta.url));

/** Every slide, each written twice: as grid boxes (`.grid.diagram`) and as a grid diagram of intent (`.dx`). */
const SLIDES = ['agent', 'agents', 'architecture', 'chat', 'composer', 'echo', 'hyperspace', 'ontology', 'plugins'];

const BOX_KINDS: readonly string[] = Shape.BoxKind.literals;
const isBox = (element: Shape.Element): element is Shape.Box => BOX_KINDS.includes(element.kind);

/**
 * What a document draws: every box that is not a grid, in the frame its grids give it, and every connector. The
 * grids themselves are left out, since they are how a drawing is said and two documents may say one differently.
 */
const drawn = (text: string) => {
  const { commands, problems } = Dsl.parse(text);
  const elements = commands.flatMap((command) => (command.op === 'upsert-object' ? command.object.elements : []));
  const boxes = elements.filter(isBox);
  const frames = solveGrids(boxes);
  const leaves = boxes
    .filter((box) => box.kind !== 'grid')
    .map(({ id, x: _x, y: _y, w: _w, h: _h, parent: _parent, ...rest }) => ({
      // A heading is named by the document's own convention, so it is known by what it says.
      key: rest.type === undefined ? `heading:${rest.text}` : id,
      ...rest,
      frame: frames.get(id),
    }))
    .sort((left, right) => left.key.localeCompare(right.key));
  const arrows = elements
    .flatMap((element) => (element.kind === 'arrow' ? [element] : []))
    .map(({ id: _id, ...rest }) => rest)
    .sort((left, right) => `${left.from}>${left.to}`.localeCompare(`${right.from}>${right.to}`));
  return { leaves, arrows, errors: problems.filter(({ severity }) => severity === 'error') };
};

describe('a slide as a grid diagram', () => {
  describe.each(SLIDES)('%s', (name) => {
    test('draws what its grid boxes draw', ({ expect }) => {
      const boxes = drawn(readFileSync(join(here, `${name}.grid.diagram`), 'utf8'));
      const intent = drawn(readFileSync(join(here, `${name}.dx`), 'utf8'));
      expect(intent.errors).toEqual([]);
      expect(boxes.errors).toEqual([]);
      expect(intent.leaves.length).toBeGreaterThan(0);
      expect(intent.leaves).toEqual(boxes.leaves);
      expect(intent.arrows).toEqual(boxes.arrows);
    });

    test('states no geometry but its frame', ({ expect }) => {
      const text = readFileSync(join(here, `${name}.dx`), 'utf8');
      // The frame's size is the only geometry a grid diagram states.
      expect(text.match(/\d+,\d+/g) ?? []).toEqual([]);
      expect(text.match(/\b\d+x\d+\b/g)).toEqual(['1600x880']);
    });
  });
});
