//
// Copyright 2023 DXOS.org
//

import { ComposerModel, YText } from '@dxos/aurora-composer';
import { subscribe } from '@dxos/observable-object';

export type MarkdownProperties = {
  title: string;
  meta?: { keys?: { source?: string; id?: string }[] };
};

export const isMarkdown = (datum: unknown): datum is ComposerModel =>
  datum && typeof datum === 'object'
    ? 'id' in datum &&
      typeof datum.id === 'string' &&
      'content' in datum &&
      (typeof datum.content === 'string' || datum.content instanceof YText)
    : false;

export const isMarkdownProperties = (datum: unknown): datum is MarkdownProperties =>
  datum ? typeof datum === 'object' && subscribe in datum : false;
