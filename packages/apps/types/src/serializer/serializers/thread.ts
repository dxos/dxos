//
// Copyright 2024 DXOS.org
//

import { nonNullable } from '@dxos/util';

import { type TypedObjectSerializer, validFilename } from './default';
import { type ThreadType } from '../../schema';

// TODO(burdon): Implement.
export const serializer: TypedObjectSerializer<ThreadType> = {
  filename: (object) => ({
    name: validFilename(object.name),
    extension: 'md',
  }),

  serialize: async ({ object }): Promise<string> => {
    return (
      object.messages
        .filter(nonNullable)
        .map((message) => message.text)
        .join(' | ') ?? ''
    );
  },

  deserialize: async ({ content }) => {
    throw new Error('Not implemented.');
  },
};
