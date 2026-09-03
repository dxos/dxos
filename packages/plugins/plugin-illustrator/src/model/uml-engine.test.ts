//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import type * as Scene from './scene.ts';
import { CLASS_DIAGRAM } from './testing.ts';
import { type Engine, compile } from './uml-engine.ts';
import { GRID } from './uml-grid.ts';

const objectsOf = (commands: Scene.Command[]) =>
  commands.flatMap((command) => (command.op === 'upsert-object' ? [command.object] : []));

const engines: Engine[] = ['dagre', 'elk'];

describe.each(engines)('uml-engine (%s)', (engine) => {
  test('places every class on the grid with no overlaps', async ({ expect }) => {
    const objects = objectsOf(await compile(CLASS_DIAGRAM, { engine }));
    const nodes = objects.filter((object) => object.id !== 'edges');

    expect(nodes.length).toBe(6);
    for (const node of nodes) {
      expect(node.origin!.x % GRID).toBe(0);
      expect(node.origin!.y % GRID).toBe(0);
    }

    // Equal cells: no two node frames intersect (distinct origins alone would allow overlap).
    const frames = nodes.map((node) => {
      const frame = node.elements[0] as Scene.Box;
      return { x: node.origin!.x, y: node.origin!.y, w: frame.w, h: frame.h };
    });
    for (let a = 0; a < frames.length; a++) {
      for (let b = a + 1; b < frames.length; b++) {
        const overlap =
          frames[a].x < frames[b].x + frames[b].w &&
          frames[b].x < frames[a].x + frames[a].w &&
          frames[a].y < frames[b].y + frames[b].h &&
          frames[b].y < frames[a].y + frames[a].h;
        expect(overlap).toBe(false);
      }
    }
  });

  test('ranks supertypes and dependency targets above their sources', async ({ expect }) => {
    const objects = objectsOf(await compile(CLASS_DIAGRAM, { engine }));
    const y = (id: string) => objects.find((object) => object.id === id)!.origin!.y;

    expect(y('Animal')).toBeLessThan(y('Dog'));
    expect(y('Serializable')).toBeLessThan(y('Dog'));
    expect(y('Bone')).toBeLessThan(y('Dog'));
    // Containment flows down: the part sits below the whole.
    expect(y('Dog')).toBeLessThan(y('Leg'));
  });

  test('emits the same node structure as the grid dialect', async ({ expect }) => {
    const objects = objectsOf(await compile(CLASS_DIAGRAM, { engine }));
    const dog = objects.find((object) => object.id === 'Dog')!;

    expect(dog.elements.map((element) => element.id)).toEqual(['frame', 'title', 'body']);
    expect(objects.find((object) => object.id === 'edges')).toBeDefined();
  });
});
