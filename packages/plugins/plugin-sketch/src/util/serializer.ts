//
// Copyright 2024 DXOS.org
//

import { Obj, Ref } from '@dxos/echo';
import { type TypedObjectSerializer } from '@dxos/plugin-space';

import { Sketch } from '#types';

export const serializer: TypedObjectSerializer<Sketch.Sketch> = {
  serialize: async ({ object }): Promise<string> => {
    const data = await object.canvas?.load();
    const sketch = { name: object.name, data: { ...data } };
    return JSON.stringify(sketch, null, 2);
  },

  deserialize: async ({ content, newId }) => {
    const parsed = JSON.parse(content);
    const canvas = Obj.make(Sketch.Canvas, { content: {}, ...(newId ? {} : { id: parsed.data.id }) });
    const sketch = Obj.make(Sketch.Sketch, {
      name: parsed.name,
      canvas: Ref.make(canvas),
      ...(newId ? {} : { id: parsed.id }),
    });

    setCanvasContent(canvas, parsed.data.content);
    return sketch;
  },
};

const setCanvasContent = (object: Sketch.Canvas, content: any) => {
  Obj.update(object, (object) => {
    object.content = {};
    Object.entries(content).forEach(([key, value]) => {
      object.content[key] = value;
    });
  });
};
