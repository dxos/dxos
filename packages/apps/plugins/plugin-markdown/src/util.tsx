//
// Copyright 2023 DXOS.org
//

import { type TypedObjectSerializer } from '@braneframe/plugin-space/types';
import { type Plugin } from '@dxos/app-framework';
import { debounce } from '@dxos/async';
import { create, createEchoObject, isEchoObject, loadObjectReferences } from '@dxos/react-client/echo';

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
    return JSON.stringify({ name: object.name, content: content.content });
  },

  deserialize: async ({ content: serialized }) => {
    const { name, content } = JSON.parse(serialized);
    return createEchoObject(create(DocumentType, { name, content: create(TextType, { content }), threads: [] }));
  },
};
