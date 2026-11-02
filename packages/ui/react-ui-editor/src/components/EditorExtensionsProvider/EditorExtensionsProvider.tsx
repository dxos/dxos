//
// Copyright 2026 DXOS.org
//

import React, { type PropsWithChildren, useMemo } from 'react';

import {
  EditorExtensionsContextProvider,
  type EditorExtensionsFactory,
  useEditorExtensionsContext,
} from './EditorExtensionsContext.ts';

export type EditorExtensionsProviderProps = PropsWithChildren<{ extensions: EditorExtensionsFactory }>;

/**
 * Adds extensions to every live-bound editor beneath it (see `useEditorExtensions`), after those of enclosing
 * providers, so a feature such as comments reaches editors without the components that render them knowing it.
 */
export const EditorExtensionsProvider = ({ extensions, children }: EditorExtensionsProviderProps) => {
  const { factories: parent } = useEditorExtensionsContext('EditorExtensionsProvider');
  const factories = useMemo(() => [...parent, extensions], [parent, extensions]);
  return <EditorExtensionsContextProvider factories={factories}>{children}</EditorExtensionsContextProvider>;
};
