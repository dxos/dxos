//
// Copyright 2026 DXOS.org
//

import { createTLSchema } from '@tldraw/tlschema';
import { describe, test } from 'vitest';

import { applyCommands } from './apply';
import { readScene } from './read';
import type * as Scene from './scene';

/** A face made of every element category: boxes, circles, arc sugar, polyline, text. */
const face: Scene.WorldObject = {
  id: 'face',
  origin: { x: 100, y: 100 },
  scale: 2,
  elements: [
    { kind: 'circle', id: 'head', cx: 50, cy: 50, r: 50, color: 'yellow', fill: 'solid' },
    { kind: 'circle', id: 'left-eye', cx: 30, cy: 35, r: 6, fill: 'solid' },
    { kind: 'circle', id: 'right-eye', cx: 70, cy: 35, r: 6, fill: 'solid' },
    { kind: 'line', id: 'nose', points: [{ x: 50, y: 45 }, { x: 50, y: 60 }] },
    { kind: 'arc', id: 'smile', cx: 50, cy: 55, r: 25, startAngle: 30, endAngle: 150, color: 'red' },
  ],
};

const hat: Scene.WorldObject = {
  id: 'hat',
  origin: { x: 120, y: 40 },
  scale: 2,
  elements: [
    { kind: 'rect', id: 'brim', x: 0, y: 25, w: 80, h: 6, color: 'blue', fill: 'solid' },
    { kind: 'rect', id: 'crown', x: 20, y: 0, w: 40, h: 25, color: 'blue', fill: 'solid' },
  ],
};

const upsert = (object: Scene.WorldObject): Scene.Command => ({ op: 'upsert-object', object });

describe('scene DSL', () => {
  test('renders objects and reads back a coherent scene', ({ expect }) => {
    const content = {};
    const result = applyCommands(content, [upsert(face)]);
    expect(result.upserted).to.deep.eq(['face']);

    const { scene, unmanaged } = readScene(content);
    expect(unmanaged).to.eq(0);
    expect(scene.objects).to.have.length(1);

    const read = scene.objects[0];
    expect(read.id).to.eq('face');
    // Origin is derived from the bounding box: head top-left = origin + (0,0) * scale.
    expect(read.origin).to.deep.eq({ x: 100, y: 100 });
    expect(read.scale).to.eq(2);
    expect(read.elements.map((element) => element.id)).to.deep.eq([
      'head',
      'left-eye',
      'right-eye',
      'nose',
      'smile',
    ]);

    // Circle sugar reads back as an ellipse in local units.
    const head = read.elements.find((element) => element.id === 'head');
    expect(head).to.include({ kind: 'ellipse', x: 0, y: 0, w: 100, h: 100 });
    // Arc sugar reads back as a curve.
    const smile = read.elements.find((element) => element.id === 'smile');
    expect(smile?.kind).to.eq('curve');
  });

  test('rendered records pass tldraw schema validation', ({ expect }) => {
    const content = {};
    applyCommands(content, [
      upsert(face),
      upsert(hat),
      upsert({
        id: 'labels',
        origin: { x: 0, y: 400 },
        elements: [
          { kind: 'text', id: 'caption', x: 0, y: 0, text: 'portrait' },
          { kind: 'arrow', id: 'points-at', from: 'caption', to: 'face/head', text: 'head' },
          { kind: 'line', id: 'zigzag', points: [{ x: 0, y: 20 }, { x: 10, y: 30 }, { x: 20, y: 20 }], closed: true },
          { kind: 'diamond', id: 'gem', x: 40, y: 20, w: 20, h: 20, rotation: 45, stroke: 'dashed', weight: 'l' },
        ],
      }),
    ]);

    const schema = createTLSchema();
    // tldraw types its record map as a fixed-key object without an index signature;
    // validating an arbitrary record requires a string-keyed view.
    const validators = schema.types as Record<string, { validate: (record: unknown) => unknown }>;
    for (const record of Object.values(content) as any[]) {
      expect(() => validators[record.typeName].validate(record), record.id).to.not.throw();
    }
  });

  test('cross-object arrows bind to their targets', ({ expect }) => {
    const content: Record<string, any> = {};
    applyCommands(content, [
      upsert(face),
      upsert({
        id: 'hat',
        origin: { x: 120, y: 40 },
        elements: [
          ...hat.elements,
          { kind: 'arrow', id: 'sits-on', from: 'brim', to: 'face/head' },
        ],
      }),
    ]);

    const bindings = Object.values(content).filter((record) => record.typeName === 'binding');
    expect(bindings.map((binding) => binding.toId).sort()).to.deep.eq(['shape:face/head', 'shape:hat/brim']);

    const { scene } = readScene(content);
    const arrow = scene.objects
      .find((object) => object.id === 'hat')
      ?.elements.find((element) => element.id === 'sits-on');
    expect(arrow).to.include({ kind: 'arrow', from: 'brim', to: 'face/head' });
  });

  test('upsert-elements replaces by id and keeps the rest', ({ expect }) => {
    const content = {};
    applyCommands(content, [upsert(face)]);
    const before = readScene(content).scene.objects[0];

    // Make the smile a frown (upper arc), leave everything else untouched.
    applyCommands(content, [
      {
        op: 'upsert-elements',
        objectId: 'face',
        elements: [{ kind: 'arc', id: 'smile', cx: 50, cy: 70, r: 20, startAngle: 210, endAngle: 330 }],
      },
    ]);

    const after = readScene(content).scene.objects[0];
    expect(after.elements).to.have.length(before.elements.length);
    expect(after.elements.find((element) => element.id === 'head')).to.deep.eq(
      before.elements.find((element) => element.id === 'head'),
    );
    expect(after.elements.find((element) => element.id === 'smile')).to.not.deep.eq(
      before.elements.find((element) => element.id === 'smile'),
    );
  });

  test('remove and move commands', ({ expect }) => {
    const content: Record<string, any> = {};
    applyCommands(content, [upsert(face), upsert(hat)]);

    const moved = applyCommands(content, [{ op: 'move-object', objectId: 'hat', origin: { x: 220, y: 140 } }]);
    expect(moved.upserted).to.deep.eq(['hat']);
    const hatRead = readScene(content).scene.objects.find((object) => object.id === 'hat');
    expect(hatRead?.origin).to.deep.eq({ x: 220, y: 140 });
    // Local geometry is unchanged by a move.
    expect(hatRead?.elements.find((element) => element.id === 'brim')).to.include({ x: 0, y: 25, w: 80, h: 6 });

    const removedElements = applyCommands(content, [
      { op: 'remove-elements', objectId: 'face', elementIds: ['left-eye', 'right-eye'] },
    ]);
    expect(removedElements.removed).to.eq(2);

    const removedObject = applyCommands(content, [{ op: 'remove-object', objectId: 'hat' }]);
    expect(removedObject.removed).to.eq(2);
    expect(readScene(content).scene.objects.map((object) => object.id)).to.deep.eq(['face']);
  });

  test('removing an arrow target also drops its bindings', ({ expect }) => {
    const content: Record<string, any> = {};
    applyCommands(content, [
      upsert({
        id: 'graph',
        origin: { x: 0, y: 0 },
        elements: [
          { kind: 'rect', id: 'a', x: 0, y: 0, w: 40, h: 20 },
          { kind: 'rect', id: 'b', x: 100, y: 0, w: 40, h: 20 },
          { kind: 'arrow', id: 'a-to-b', from: 'a', to: 'b' },
        ],
      }),
    ]);
    expect(Object.values(content).filter((record) => record.typeName === 'binding')).to.have.length(2);

    applyCommands(content, [{ op: 'remove-elements', objectId: 'graph', elementIds: ['b'] }]);
    const bindings = Object.values(content).filter((record) => record.typeName === 'binding');
    // Only the binding to the surviving shape remains; nothing dangles.
    expect(bindings).to.have.length(1);
    expect(bindings[0].toId).to.eq('shape:graph/a');
  });

  test('unmanaged shapes are counted but not read as scene objects', ({ expect }) => {
    const content: Record<string, any> = {};
    applyCommands(content, [upsert(hat)]);
    content['shape:user'] = {
      id: 'shape:user',
      typeName: 'shape',
      type: 'geo',
      x: 0,
      y: 0,
      rotation: 0,
      index: 'a99',
      parentId: 'page:page',
      isLocked: false,
      opacity: 1,
      meta: {},
      props: { geo: 'rectangle', w: 10, h: 10 },
    };

    const { scene, unmanaged } = readScene(content);
    expect(unmanaged).to.eq(1);
    expect(scene.objects.map((object) => object.id)).to.deep.eq(['hat']);
  });

  test('upsert-elements on an unknown object fails with guidance', ({ expect }) => {
    expect(() =>
      applyCommands({}, [{ op: 'upsert-elements', objectId: 'ghost', elements: [] }]),
    ).to.throw(/unknown object/);
  });
});
