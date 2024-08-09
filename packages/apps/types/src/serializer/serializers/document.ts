//
// Copyright 2024 DXOS.org
//

import { createEchoObject, loadObjectReferences } from '@dxos/client/echo';
import { create } from '@dxos/echo-schema';

import { type TypedObjectSerializer } from './types';
import { DocumentType, TextType } from '../../schema';

export const serializer: TypedObjectSerializer<DocumentType> = {
  serialize: async ({ object }): Promise<string> => {
    const content = await loadObjectReferences(object, (doc) => doc.content);
    return JSON.stringify({ name: object.name, content: content.content });
  },

  deserialize: async ({ content: serialized }) => {
    const { name, content } = JSON.parse(serialized);
    return createEchoObject(create(DocumentType, { name, content: create(TextType, { content }), threads: [] }));
  },
};
