//
// Copyright 2023 DXOS.org
//

import { type Document } from '@braneframe/types';
import { type Plugin } from '@dxos/app-framework';
import { getTextContent, isTypedObject } from '@dxos/react-client/echo'; // TODO(burdon): Should not expose.

import { type MarkdownProperties, type MarkdownExtensionProvides } from './types';

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
