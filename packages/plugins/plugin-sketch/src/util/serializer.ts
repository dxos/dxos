//
// Copyright 2024 DXOS.org
//

import { Obj, Ref } from '@dxos/echo';
import { getObjectCore } from '@dxos/echo-db';
import { type TypedObjectSerializer } from '@dxos/plugin-space/types';

import { Sketch } from '../types';

export const serializer: TypedObjectSerializer<Sketch.Sketch> = {
  serialize: async ({ object }): Promise<string> => {
    const data = await object.canvas?.load();
    const sketch = { name: object.name, data: { ...data } };
    return JSON.stringify(sketch, null, 2);
  },

  deserialize: async ({ content, newId }) => {
    const parsed = JSON.parse(content);
    const canvas = Obj.make(Sketch.Canvas, { content: {} });
    const sketch = Obj.make(Sketch.Sketch, { name: parsed.name, canvas: Ref.make(canvas) });

    if (!newId) {
      const core = getObjectCore(sketch);
      core.id = parsed.id;

      const canvasCore = getObjectCore(canvas);
      canvasCore.id = parsed.data.id;
    }

    setCanvasContent(canvas, parsed.data.content);
    return sketch;
  },
};

const setCanvasContent = (object: Sketch.Canvas, content: any) => {
  Obj.change(object, (obj) => {
    obj.content = {};
    Object.entries(content).forEach(([key, value]) => {
      obj.content[key] = value;
    });
  });
};
