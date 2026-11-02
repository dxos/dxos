//
// Copyright 2026 DXOS.org
//

import { type Extension } from '@codemirror/state';
import { useMemo } from 'react';

import { type Obj } from '@dxos/echo';
import { type Doc } from '@dxos/echo-doc';
import { createContext } from '@dxos/react-hooks';

// Kept out of `EditorExtensionsProvider.tsx` so that module exports only components (see EditorPreviewContext.ts).

/** A step into an object, as in Automerge's ref paths: a key, an array index, or the array element matching fields. */
export type EditorPathSegment = string | number | { readonly [field: string]: unknown };

/** The string a live-bound editor edits. */
export type EditorBinding = {
  object: Obj.Unknown;
  /** The key path the editor's accessor binds to. */
  path: Doc.KeyPath;
  /**
   * The same place as stored beside the object (comment anchors), when array elements are addressed by a stable field
   * rather than an index; defaults to `path`.
   */
  anchor?: readonly EditorPathSegment[];
};

/** Extensions for every live-bound editor beneath the provider, given what the editor edits. */
export type EditorExtensionsFactory = (binding: EditorBinding) => Extension;

export const [EditorExtensionsContextProvider, useEditorExtensionsContext] = createContext<{
  factories: readonly EditorExtensionsFactory[];
}>('EditorExtensions', { factories: [] });

/** The extensions the enclosing providers add to an editor bound to `binding`; none when unbound. */
export const useEditorExtensions = (binding: EditorBinding | undefined): Extension[] => {
  const { factories } = useEditorExtensionsContext('useEditorExtensions');
  const place = binding && JSON.stringify([binding.path, binding.anchor]);
  return useMemo(
    () => (binding ? factories.map((factory) => factory(binding)) : []),
    [factories, binding?.object, place],
  );
};
