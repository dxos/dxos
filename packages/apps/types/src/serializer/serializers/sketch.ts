//
// Copyright 2024 DXOS.org
//

import { Expando, loadObjectReferences, createEchoObject, create, getObjectCore } from '@dxos/client/echo';

import { type TypedObjectSerializer, validFilename } from './default';
import { SketchType } from '../../schema';

export const serializer: TypedObjectSerializer<SketchType> = {
  filename: (object) => ({
    name: validFilename(object.title),
    extension: 'json',
  }),

  serialize: async ({ object }): Promise<string> => {
    // TODO(wittjosiah): Implement `toJSON` method?
    const data = await loadObjectReferences(object, (s) => s.data);
    const sketch = { ...object, data: { ...data } };
    return JSON.stringify(sketch, null, 2);
  },

  deserialize: async ({ content, object: existingSketch, newId }) => {
    const parsed = JSON.parse(content);

    if (existingSketch instanceof SketchType) {
      existingSketch.title = parsed.title;
      const data = await loadObjectReferences(existingSketch, (s) => s.data);
      setSketchData(data, parsed.data.content);
      return existingSketch;
    } else {
      const data = create(Expando, {});
      const sketch = createEchoObject(create(SketchType, { title: parsed.title, data }));

      if (!newId) {
        const core = getObjectCore(sketch);
        core.id = parsed.id;

        const dataCore = getObjectCore(data);
        dataCore.id = parsed.data.id;
      }

      setSketchData(data, parsed.data.content);

      return sketch;
    }
  },
};

const setSketchData = (object: Expando, content: any) => {
  object.content = {};
  Object.entries(content).forEach(([key, value]) => {
    object.content[key] = value;
  });
};
