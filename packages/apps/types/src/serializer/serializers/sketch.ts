//
// Copyright 2024 DXOS.org
//

import { create, createEchoObject, getObjectCore, loadObjectReferences } from '@dxos/client/echo';

import { type TypedObjectSerializer, validFilename } from './default';
import { CanvasType, DiagramType } from '../../schema';

export const serializer: TypedObjectSerializer<DiagramType> = {
  filename: (object) => ({
    name: validFilename(object.name),
    extension: 'json',
  }),

  serialize: async ({ object }): Promise<string> => {
    // TODO(wittjosiah): Implement `toJSON` method?
    const data = await loadObjectReferences(object, (s) => s.canvas);
    const sketch = { ...object, data: { ...data } };
    return JSON.stringify(sketch, null, 2);
  },

  deserialize: async ({ content, object: existingSketch, newId }) => {
    const parsed = JSON.parse(content);

    if (existingSketch instanceof DiagramType) {
      existingSketch.name = parsed.title;
      const data = await loadObjectReferences(existingSketch, (s) => s.canvas);
      setCanvasContent(data, parsed.data.content);
      return existingSketch;
    } else {
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
    }
  },
};

const setCanvasContent = (object: CanvasType, content: any) => {
  object.content = {};
  Object.entries(content).forEach(([key, value]) => {
    object.content[key] = value;
  });
};
