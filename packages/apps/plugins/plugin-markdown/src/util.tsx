//
// Copyright 2023 DXOS.org
//

import { type Document } from '@braneframe/types';
import { type Plugin } from '@dxos/app-framework';
import { isTypedObject } from '@dxos/react-client/echo'; // TODO(burdon): Should not expose.
import { type EditorModel, YText } from '@dxos/react-ui-editor';

import { type MarkdownProperties, type MarkdownProvides } from './types';

// TODO(burdon): These tests clash with Diagram.content.
//  Uncaught Error: Type with the name content has already been defined with a different constructor.
// TODO(burdon): This is being passed the text content (not the object)?
export const __isMarkdown = (object: { [key: string]: any }): object is EditorModel => {
  try {
    return (
      'id' in object &&
      typeof object.id === 'string' &&
      (typeof object.content === 'string' || object.content instanceof YText)
    );
  } catch (err) {
    console.error('isMarkdown error', err, object);
    return false;
  }
};

export const isMarkdown = (data: unknown): data is EditorModel =>
  data && typeof data === 'object'
    ? 'id' in data &&
      typeof data.id === 'string' &&
      (typeof (data as { [key: string]: any }).content === 'string' ||
        (data as { [key: string]: any }).content instanceof YText)
    : false;

export const isMarkdownContent = (data: unknown): data is { content: EditorModel } =>
  !!data &&
  typeof data === 'object' &&
  (data as { [key: string]: any }).content &&
  isMarkdown((data as { [key: string]: any }).content);

export const isMarkdownPlaceholder = (data: unknown): data is EditorModel =>
  data && typeof data === 'object'
    ? 'id' in data && typeof data.id === 'string' && 'content' in data && typeof data.content === 'function'
    : false;

export const isMarkdownProperties = (data: unknown): data is MarkdownProperties =>
  isTypedObject(data)
    ? true
    : data && typeof data === 'object'
    ? 'title' in data && typeof data.title === 'string'
    : false;

type MarkdownPlugin = Plugin<MarkdownProvides>;

export const markdownPlugins = (plugins: Plugin[]): MarkdownPlugin[] => {
  return (plugins as MarkdownPlugin[]).filter((plugin) => Boolean(plugin.provides?.markdown));
};

const nonTitleChars = /[^\w ]/g;

export const getFallbackTitle = (document: Document) => {
  return document.content.content?.toString().substring(0, 63).split('\n')[0].replaceAll(nonTitleChars, '').trim();
};
