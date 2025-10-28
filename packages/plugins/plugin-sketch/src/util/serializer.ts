//
// Copyright 2024 DXOS.org
//

import { Obj, Ref } from '@dxos/echo';
import { type TypedObjectSerializer } from '@dxos/plugin-space/types';
import { getObjectCore } from '@dxos/react-client/echo';

import { Diagram } from '../types';

export const serializer: TypedObjectSerializer<Diagram.Diagram> = {
  serialize: async ({ object }): Promise<string> => {
    const data = await object.canvas?.load();
    const sketch = { name: object.name, data: { ...data } };
    return JSON.stringify(sketch, null, 2);
  },

  deserialize: async ({ content, newId }) => {
    const parsed = JSON.parse(content);
    const canvas = Obj.make(Diagram.Canvas, { content: {} });
    const diagram = Obj.make(Diagram.Diagram, { name: parsed.name, canvas: Ref.make(canvas) });

    if (!newId) {
      const core = getObjectCore(diagram);
      core.id = parsed.id;

      const canvasCore = getObjectCore(canvas);
      canvasCore.id = parsed.data.id;
    }

    setCanvasContent(canvas, parsed.data.content);
    return diagram;
  },
};

const setCanvasContent = (object: Diagram.Canvas, content: any) => {
  object.content = {};
  Object.entries(content).forEach(([key, value]) => {
    object.content[key] = value;
  });
};
