//
// Copyright 2023 DXOS.org
//

import { type Document } from '@braneframe/types';
import { type Plugin } from '@dxos/app-framework';
import { getTextContent, isTypedObject } from '@dxos/react-client/echo'; // TODO(burdon): Should not expose.
import { type EditorModel, YText } from '@dxos/react-ui-editor';

import { type MarkdownProperties, type MarkdownExtensionProvides } from './types';

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

/** Type-guard for an EditorModel */
export const isEditorModel = (data: unknown): data is EditorModel =>
  data && typeof data === 'object'
    ? 'id' in data && typeof data.id === 'string' && typeof (data as { [key: string]: any }).text === 'function'
    : false;

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

type MarkdownExtensionPlugin = Plugin<MarkdownExtensionProvides>;

export const markdownExtensionPlugins = (plugins: Plugin[]): MarkdownExtensionPlugin[] => {
  return (plugins as MarkdownExtensionPlugin[]).filter((plugin) => Boolean(plugin.provides?.markdown));
};

const nonTitleChars = /[^\w ]/g;

export const getFallbackTitle = (document: Document) => {
  const content = getTextContent(document.content);
  return content?.substring(0, 31).split('\n')[0].replaceAll(nonTitleChars, '').trim();
};
