//
// Copyright 2023 DXOS.org
//

import { type DocumentType } from '@braneframe/types';
import { type Plugin } from '@dxos/app-framework';
import { isEchoReactiveObject } from '@dxos/echo-schema';

import { type MarkdownProperties, type MarkdownExtensionProvides } from './types';

export const isMarkdownProperties = (data: unknown): data is MarkdownProperties =>
  isEchoReactiveObject(data)
    ? true
    : data && typeof data === 'object'
      ? 'title' in data && typeof data.title === 'string'
      : false;

type MarkdownExtensionPlugin = Plugin<MarkdownExtensionProvides>;

export const markdownExtensionPlugins = (plugins: Plugin[]): MarkdownExtensionPlugin[] => {
  return (plugins as MarkdownExtensionPlugin[]).filter((plugin) => Boolean(plugin.provides?.markdown));
};

const nonTitleChars = /[^\w ]/g;

export const getFallbackTitle = (document: DocumentType) => {
  const content = document.content?.content;
  return content?.substring(0, 31).split('\n')[0].replaceAll(nonTitleChars, '').trim();
};
