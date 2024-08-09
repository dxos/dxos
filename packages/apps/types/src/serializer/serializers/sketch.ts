//
// Copyright 2024 DXOS.org
//

import { create, createEchoObject, getObjectCore, loadObjectReferences } from '@dxos/client/echo';

import { type TypedObjectSerializer } from './types';
import { CanvasType, DiagramType } from '../../schema';

export const serializer: TypedObjectSerializer<DiagramType> = {
  serialize: async ({ object }): Promise<string> => {
    const data = await loadObjectReferences(object, (s) => s.canvas);
    const sketch = { ...object, data: { ...data } };
    return JSON.stringify(sketch, null, 2);
  },

  deserialize: async ({ content, newId }) => {
    const parsed = JSON.parse(content);
    const canvas = create(CanvasType, { content: {} });
    const diagram = createEchoObject(create(DiagramType, { name: parsed.title, canvas }));

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
