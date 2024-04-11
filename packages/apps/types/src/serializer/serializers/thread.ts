//
// Copyright 2024 DXOS.org
//

import { nonNullable } from '@dxos/util';

import { type ThreadType } from '../../schema';
import { type TypedObjectSerializer, validFilename } from '../serializer';

// TODO(burdon): Implement.
export const serializer: TypedObjectSerializer = {
  filename: (object: ThreadType) => ({
    name: validFilename(object.title),
    extension: 'md',
  }),

  serialize: async (object: ThreadType): Promise<string> => {
    return (
      object.messages
        .filter(nonNullable)
        .map((message) => message.blocks.map((block) => `${(block.content as any)?.text}`).join(' - '))
        .join(' | ') ?? ''
    );
  },

  deserialize: async (text: string) => {
    throw new Error('Not implemented.');
  },
};
