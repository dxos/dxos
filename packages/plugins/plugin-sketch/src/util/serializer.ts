//
// Copyright 2024 DXOS.org
//

import { type TypedObjectSerializer } from '@dxos/plugin-space/types';
import { live, createObject, getObjectCore, makeRef } from '@dxos/react-client/echo';

import { CanvasType, DiagramType } from '../types';

export const serializer: TypedObjectSerializer<DiagramType> = {
  serialize: async ({ object }): Promise<string> => {
    const data = await object.canvas?.load();
    const sketch = { name: object.name, data: { ...data } };
    return JSON.stringify(sketch, null, 2);
  },

  deserialize: async ({ content, newId }) => {
    const parsed = JSON.parse(content);
    const canvas = live(CanvasType, { content: {} });
    const diagram = createObject(live(DiagramType, { name: parsed.name, canvas: makeRef(canvas) }));

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

const setCanvasContent = (object: CanvasType, content: any) => {
  object.content = {};
  Object.entries(content).forEach(([key, value]) => {
    object.content[key] = value;
  });
};
