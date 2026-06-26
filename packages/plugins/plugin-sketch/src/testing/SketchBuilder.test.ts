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
