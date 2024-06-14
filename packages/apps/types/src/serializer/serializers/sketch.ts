//
// Copyright 2024 DXOS.org
//

import { type TypedObjectSerializer, validFilename } from './default';
import { type SketchType } from '../../schema';

export const serializer: TypedObjectSerializer<SketchType> = {
  filename: (object) => ({
    name: validFilename(object.name),
    extension: 'json',
  }),

  serialize: async ({ object }): Promise<string> => {
    throw new Error('Not implemented.');
  },

  deserialize: async ({ content }) => {
    throw new Error('Not implemented.');
  },
};
