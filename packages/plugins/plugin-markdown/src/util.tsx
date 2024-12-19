//
// Copyright 2023 DXOS.org
//

import { type Plugin } from '@dxos/app-framework';
import { debounce } from '@dxos/async';
import { type TypedObjectSerializer } from '@dxos/plugin-space/types';
import { create, createObject, isEchoObject, loadObjectReferences, makeRef } from '@dxos/react-client/echo';

import { DocumentType, type MarkdownProperties, type MarkdownExtensionProvides, TextType } from './types';

export const isMarkdownProperties = (data: unknown): data is MarkdownProperties =>
  isEchoObject(data)
    ? true
    : data && typeof data === 'object'
      ? 'title' in data && typeof data.title === 'string'
      : false;

type MarkdownExtensionPlugin = Plugin<MarkdownExtensionProvides>;

export const markdownExtensionPlugins = (plugins: Plugin[]): MarkdownExtensionPlugin[] => {
  return (plugins as MarkdownExtensionPlugin[]).filter((plugin) => Boolean(plugin.provides?.markdown));
};

const nonTitleChars = /[^\w ]/g;

export const getFallbackName = (content: string) => {
  return content.substring(0, 31).split('\n')[0].replaceAll(nonTitleChars, '').trim();
};

export const setFallbackName = debounce((doc: DocumentType, content: string) => {
  const name = getFallbackName(content);
  if (doc.fallbackName !== name) {
    doc.fallbackName = name;
  }
}, 200);

export const serializer: TypedObjectSerializer<DocumentType> = {
  serialize: async ({ object }): Promise<string> => {
    const content = await loadObjectReferences(object, (doc) => doc.content);
    return JSON.stringify({ name: object.name, fallbackName: object.fallbackName, content: content.target?.content });
  },

  deserialize: async ({ content: serialized }) => {
    const { name, fallbackName, content } = JSON.parse(serialized);
    return createObject(
      create(DocumentType, { name, fallbackName, content: makeRef(create(TextType, { content })), threads: [] }),
    );
  },
};
