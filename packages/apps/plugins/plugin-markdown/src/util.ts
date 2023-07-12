//
// Copyright 2023 DXOS.org
//

import { ComposerModel, YText } from '@dxos/aurora-composer';
import { subscribe } from '@dxos/observable-object';
import { Plugin } from '@dxos/react-surface';

import { MarkdownProperties, MarkdownProvides } from './types';

export const isMarkdown = (datum: unknown): datum is ComposerModel =>
  datum && typeof datum === 'object'
    ? 'id' in datum &&
      typeof datum.id === 'string' &&
      (typeof (datum as { [key: string]: any }).content === 'string' ||
        (datum as { [key: string]: any }).content instanceof YText)
    : false;

export const isMarkdownContent = (datum: unknown): datum is { content: ComposerModel } =>
  !!datum &&
  typeof datum === 'object' &&
  (datum as { [key: string]: any }).content &&
  isMarkdown((datum as { [key: string]: any }).content);

export const isMarkdownPlaceholder = (datum: unknown): datum is ComposerModel =>
  datum && typeof datum === 'object'
    ? 'id' in datum && typeof datum.id === 'string' && 'content' in datum && typeof datum.content === 'function'
    : false;

export const isMarkdownProperties = (datum: unknown): datum is MarkdownProperties =>
  datum && typeof datum === 'object'
    ? subscribe in datum || ('title' in datum && typeof datum.title === 'string')
    : false;

type MarkdownPlugin = Plugin<MarkdownProvides>;
export const markdownPlugins = (plugins: Plugin[]): MarkdownPlugin[] => {
  return (plugins as MarkdownPlugin[]).filter((p) => Boolean(p.provides?.markdown));
};
