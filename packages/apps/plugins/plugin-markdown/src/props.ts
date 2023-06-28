//
// Copyright 2023 DXOS.org
//

import { ComposerModel, YText } from '@dxos/aurora-composer';
import { subscribe } from '@dxos/observable-object';

export type MarkdownProperties = {
  title: string;
  meta?: { keys?: { source?: string; id?: string }[] };
  readOnly?: boolean;
};

export const isMarkdown = (datum: unknown): datum is ComposerModel =>
  datum && typeof datum === 'object'
    ? 'id' in datum &&
      typeof datum.id === 'string' &&
      (typeof (datum as { [key: string]: any }).content === 'string' ||
        (datum as { [key: string]: any }).content instanceof YText)
    : false;

export const isMarkdownPlaceholder = (datum: unknown): datum is ComposerModel =>
  datum && typeof datum === 'object'
    ? 'id' in datum && typeof datum.id === 'string' && 'content' in datum && typeof datum.content === 'function'
    : false;

export const isMarkdownProperties = (datum: unknown): datum is MarkdownProperties =>
  datum && typeof datum === 'object'
    ? subscribe in datum || ('title' in datum && typeof datum.title === 'string')
    : false;
