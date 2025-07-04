//
// Copyright 2023 DXOS.org
//

import { debounce } from '@dxos/async';
import { Obj, Ref } from '@dxos/echo';
import { type TypedObjectSerializer } from '@dxos/plugin-space/types';
import { DataType } from '@dxos/schema';

import { DocumentType, type MarkdownProperties } from './types';

export const isMarkdownProperties = (data: unknown): data is MarkdownProperties =>
  (Obj.isObject(data) as boolean)
    ? true
    : data && typeof data === 'object'
      ? 'title' in data && typeof data.title === 'string'
      : false;

const nonTitleChars = /[^\w ]/g;

export const getFallbackName = (content: string) => {
  return content.substring(0, 31).split('\n')[0].replaceAll(nonTitleChars, '').trim();
};

export const getAbstract = (content: string) => {
  return content.substring(0, 128).split('\n')[0].replaceAll(nonTitleChars, '').trim();
};

export const setFallbackName = debounce((doc: DocumentType, content: string) => {
  const name = getFallbackName(content);
  if (doc.fallbackName !== name) {
    doc.fallbackName = name;
  }
}, 200);

export const serializer: TypedObjectSerializer<DocumentType> = {
  serialize: async ({ object }): Promise<string> => {
    const { content } = await object.content.load();
    return JSON.stringify({ name: object.name, fallbackName: object.fallbackName, content });
  },

  deserialize: async ({ content: serialized }) => {
    const { name, fallbackName, content } = JSON.parse(serialized);
    return Obj.make(DocumentType, { name, fallbackName, content: Ref.make(Obj.make(DataType.Text, { content })) });
  },
};
