//
// Copyright 2026 DXOS.org
//

import { type Extension } from '@codemirror/state';
import { useMemo } from 'react';

import { type Obj } from '@dxos/echo';
import { type Doc } from '@dxos/echo-doc';
import { createContext } from '@dxos/react-hooks';

// Kept out of `EditorExtensionsProvider.tsx` so that module exports only components (see EditorPreviewContext.ts).

/** The string a live-bound editor edits. */
export type EditorBinding = {
  object: Obj.Unknown;
  /** The key path the editor's accessor binds to. */
  path: Doc.KeyPath;
  /** The object annotations such as comments belong to, when it only references `object` (a document's text). */
  subject?: Obj.Unknown;
};

/** Extensions for every live-bound editor beneath the provider, given what the editor edits. */
export type EditorExtensionsFactory = (binding: EditorBinding) => Extension;

export const [EditorExtensionsContextProvider, useEditorExtensionsContext] = createContext<{
  factories: readonly EditorExtensionsFactory[];
}>('EditorExtensions', { factories: [] });

/** The extensions the enclosing providers add to an editor bound to `binding`; none when unbound. */
export const useEditorExtensions = (binding: EditorBinding | undefined): Extension[] => {
  const { factories } = useEditorExtensionsContext('useEditorExtensions');
  const path = binding && JSON.stringify(binding.path);
  return useMemo(
    () => (binding ? factories.map((factory) => factory(binding)) : []),
    [factories, binding?.object, binding?.subject, path],
  );
};
