//
// Copyright 2026 DXOS.org
//

import { type Extension } from '@codemirror/state';
import { useMemo } from 'react';

import * as Hooks from '@dxos/app-framework/Hooks';
import { type Obj } from '@dxos/echo';
import { type Doc } from '@dxos/echo-doc';
import * as MarkdownCapabilities from '@dxos/plugin-markdown/MarkdownCapabilities';

/**
 * Editor extensions other plugins contribute (e.g. plugin-github's `#123` decoration and link
 * chips), read by the component that builds the editor — the same contract `MarkdownArticle`
 * honours for markdown documents. There is no document here; the edited object (the outline, the
 * task set) stands in for it, so a contribution can resolve against the project that owns it, and
 * `binding` names the text the editor is bound to, so anchors such as comments resolve against it.
 */
export const useMarkdownExtensions = (
  subject?: Obj.Unknown,
  binding?: { object: Obj.Unknown; path: Doc.KeyPath },
): Extension[] => {
  const extensionProviders = Hooks.useCapabilities(MarkdownCapabilities.ExtensionProvider);
  return useMemo(
    () =>
      (extensionProviders ?? [])
        .flat()
        .map((provider) => (typeof provider === 'function' ? provider({ subject, binding }) : provider))
        .filter((extension): extension is Extension => !!extension),
    [extensionProviders, subject, binding],
  );
};
