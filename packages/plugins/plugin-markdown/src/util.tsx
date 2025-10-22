//
// Copyright 2023 DXOS.org
//

import { debounce } from '@dxos/async';
import { Obj } from '@dxos/echo';
import { type TypedObjectSerializer } from '@dxos/plugin-space/types';

import { Markdown } from './types';

/**
 * Checks if an object conforms to the interface needed to render an editor.
 * @deprecated Use Schema.instanceOf(Markdown.Document, data)
 */
// TODO(burdon): Normalize types (from FilesPlugin).
export const isEditorModel = (data: any): data is { id: string; text: string } =>
  data &&
  typeof data === 'object' &&
  'id' in data &&
  typeof data.id === 'string' &&
  'text' in data &&
  typeof data.text === 'string';

export type MarkdownProperties = Record<string, any>;

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

export const getContentSnippet = (content: string) => {
  const abstract = content
    .split('\n')
    .filter((line) => !line.startsWith('#'))
    .filter((line) => line.trim() !== '')[0]
    .replaceAll(nonTitleChars, '')
    .trim();
  return abstract;
};

export const setFallbackName = debounce((doc: Markdown.Document, content: string) => {
  const name = getFallbackName(content);
  if (doc.fallbackName !== name) {
    doc.fallbackName = name;
  }
}, 200);

export const serializer: TypedObjectSerializer<Markdown.Document> = {
  serialize: async ({ object }): Promise<string> => {
    const { content } = await object.content.load();
    return JSON.stringify({ name: object.name, fallbackName: object.fallbackName, content });
  },

  deserialize: async ({ content: serialized }) => {
    const { name, fallbackName, content } = JSON.parse(serialized);
    return Markdown.makeDocument({ name, fallbackName, content });
  },
};
