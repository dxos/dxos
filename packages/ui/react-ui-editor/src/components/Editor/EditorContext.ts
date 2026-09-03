//
// Copyright 2025 DXOS.org
//

import { type Extension } from '@codemirror/state';
import { createContext } from '@radix-ui/react-context';
import type * as Atom from 'effect/unstable/reactivity/Atom';

import { type XmlWidgetState } from '@dxos/ui-editor';

import { type EditorToolbarState } from '../EditorToolbar/types.ts';
import { type EditorController } from './controller.ts';

// Kept out of `Editor.tsx`: react-refresh only fast-refreshes a module whose exports are all
// components, so a context and its hook exported beside them force a full page reload on every edit.

//
// Context
//

export type EditorContextValue = {
  controller?: EditorController;
  setController: (controller: EditorController) => void;
  extensions?: Extension[];
  /** xmlTags widget portals (embedded blocks); rendered by `Editor.Blocks`, fed via `setWidgets`. */
  widgets?: XmlWidgetState[];
  state: Atom.Writable<EditorToolbarState>;
};

export const [EditorContextProvider, useEditorContext] = createContext<EditorContextValue>('Editor');

/**
 * Access the editor context. Must be used within `Editor.Root`.
 */
