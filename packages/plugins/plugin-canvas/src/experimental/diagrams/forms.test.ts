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

/** A box that draws: one with text, a component, a fill or a border. A plain rect with none only holds its cell. */
const draws = (box: Shape.Box): boolean =>
  box.kind === 'grid'
    ? box.border === true || (box.fill !== undefined && box.fill !== 'none')
    : box.text !== undefined || box.type !== undefined || box.border !== false || box.fill !== 'none';

/**
 * What a document draws: every box that shows, in the frame its grids give it, and every connector between the
 * frames it joins. A grid that shows nothing is left out, since it is how a drawing is said and two documents may
 * say one differently; so is a box that only holds a cell, which an empty group says as well.
 */
const drawn = (text: string) => {
  const { commands, problems } = Dsl.parse(text);
  const elements = commands.flatMap((command) => (command.op === 'upsert-object' ? command.object.elements : []));
  const boxes = elements.filter(isBox);
  const frames = solveGrids(boxes);
  const leaves = boxes
    .filter((box) => box.kind !== 'grid' && draws(box))
    .map(({ id, x: _x, y: _y, w: _w, h: _h, parent: _parent, ...rest }) => ({
      // A heading is named by the document's own convention, so it is known by what it says.
      key: rest.type === undefined ? `heading:${rest.text}` : id,
      ...rest,
      frame: frames.get(id),
    }))
    .sort((left, right) => left.key.localeCompare(right.key));
  // A frame a grid draws round its members is known by where it is: its id and its tracks are the document's own.
  const borders = boxes
    .filter((box) => box.kind === 'grid' && draws(box))
    .map(({ id, color, fill, stroke, border }) => ({ frame: frames.get(id), color, fill, stroke, border }))
    .sort((left, right) => JSON.stringify(left.frame).localeCompare(JSON.stringify(right.frame)));
  // An end names a box, perhaps with a place on it (`frame/nav`, `box#left`); the frame is the box's.
  const frameOf = (ref: string) => frames.get(ref.split(/[/#]/)[0]);
  const arrows = elements
    .flatMap((element) => (element.kind === 'arrow' ? [element] : []))
    .map(({ id: _id, ...rest }) => ({
      ...rest,
      fromFrame: typeof rest.from === 'string' ? frameOf(rest.from) : undefined,
      toFrame: typeof rest.to === 'string' ? frameOf(rest.to) : undefined,
    }))
    .sort((left, right) => `${left.from}>${left.to}`.localeCompare(`${right.from}>${right.to}`));
  return { leaves, borders, arrows, errors: problems.filter(({ severity }) => severity === 'error') };
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
      expect(intent.borders).toEqual(boxes.borders);
      expect(intent.arrows).toEqual(boxes.arrows);
      for (const { fromFrame, toFrame } of intent.arrows) {
        expect(fromFrame).toBeDefined();
        expect(toFrame).toBeDefined();
      }
    });

    test('states no geometry but its frame', ({ expect }) => {
      const text = readFileSync(join(here, `${name}.dx`), 'utf8');
      // The frame's size is the only geometry a grid diagram states.
      expect(text.match(/\d+,\d+/g) ?? []).toEqual([]);
      expect(text.match(/\b\d+x\d+\b/g)).toEqual(['1600x880']);
    });
  });
});
