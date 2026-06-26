//
// Copyright 2024 DXOS.org
//

import { createTLSchema } from '@tldraw/tlschema';
import { describe, test } from 'vitest';

import { SketchBuilder } from './SketchBuilder';

describe('SketchBuilder', () => {
  test('builds an empty canvas with document and page', ({ expect }) => {
    const content = new SketchBuilder().build();
    expect(content['document:document'].typeName).to.eq('document');
    expect(content['page:page'].typeName).to.eq('page');
  });

  test('chains shapes and connectors', ({ expect }) => {
    const content = new SketchBuilder()
      .rectangle({ id: 'a', x: 0, y: 0, text: 'DXOS', color: 'blue' })
      .ellipse({ id: 'b', x: 320, y: 0, text: 'ECHO', color: 'green' })
      .text({ x: 0, y: 240, text: 'Hello', font: 'mono' })
      .arrow({ from: 'a', to: 'b', text: 'links' })
      .build();

    const shapes = Object.values(content).filter((record: any) => record.typeName === 'shape');
    const bindings = Object.values(content).filter((record: any) => record.typeName === 'binding');
    expect(shapes).to.have.length(4);
    expect(bindings).to.have.length(2);
    expect((bindings[0] as any).toId).to.eq('shape:a');
  });

  test('connects via explicit points when shapes are not referenced', ({ expect }) => {
    const content = new SketchBuilder()
      .arrow({ id: 'arrow', start: { x: 0, y: 0 }, end: { x: 200, y: 100 } })
      .line({ id: 'line', start: { x: 0, y: 0 }, end: { x: 100, y: 0 } })
      .build();

    const arrow: any = content['shape:arrow'];
    const line: any = content['shape:line'];
    // Unbound connectors carry their geometry inline; no binding records are emitted.
    expect(arrow.props.end).to.deep.eq({ x: 200, y: 100 });
    expect(line.props.points.a2).to.deep.eq({ id: 'a2', index: 'a2', x: 100, y: 0 });
    expect(Object.values(content).filter((record: any) => record.typeName === 'binding')).to.have.length(0);
  });

  test('produces records that pass tldraw schema validation', ({ expect }) => {
    const content = new SketchBuilder()
      .rectangle({ id: 'a', x: 0, y: 0, text: 'A' })
      .circle({ id: 'b', x: 320, y: 0, text: 'B' })
      .geo('star', { id: 'c', x: 160, y: 240, color: 'yellow' })
      .text({ x: 0, y: 400, text: 'label' })
      .arrow({ from: 'a', to: 'b' })
      .line({ from: 'b', to: 'c' })
      .build();

    const schema = createTLSchema();
    // tldraw types its record map as a fixed-key object without an index signature;
    // validating an arbitrary record requires a string-keyed view.
    const validators = schema.types as Record<string, { validate: (record: unknown) => unknown }>;
    for (const record of Object.values(content)) {
      // `validate` throws on any invalid prop/shape/binding.
      expect(() => validators[record.typeName].validate(record)).to.not.throw();
    }
  });
});
