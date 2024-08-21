//
// Copyright 2023 DXOS.org
//

import { type DocumentType } from '@braneframe/types';
import { type Plugin } from '@dxos/app-framework';
import { debounce } from '@dxos/async';
import { isEchoObject } from '@dxos/react-client/echo';

import { type MarkdownProperties, type MarkdownExtensionProvides } from './types';

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
