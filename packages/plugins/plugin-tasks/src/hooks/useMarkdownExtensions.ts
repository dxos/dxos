//
// Copyright 2026 DXOS.org
//

import { type Extension } from '@codemirror/state';
import { useMemo } from 'react';

import { useCapabilities } from '@dxos/app-framework/ui';
import * as MarkdownCapabilities from '@dxos/plugin-markdown/MarkdownCapabilities';

/**
 * Editor extensions other plugins contribute (e.g. plugin-github's `#123` decoration and link
 * chips), read by the component that builds the editor — the same contract `MarkdownArticle`
 * honours for markdown documents. Called with no document: a task's text belongs to no document.
 */
export const useMarkdownExtensions = (): Extension[] => {
  const extensionProviders = useCapabilities(MarkdownCapabilities.ExtensionProvider);
  return useMemo(
    () =>
      (extensionProviders ?? [])
        .flat()
        .map((provider) => (typeof provider === 'function' ? provider({}) : provider))
        .filter((extension): extension is Extension => !!extension),
    [extensionProviders],
  );
};
