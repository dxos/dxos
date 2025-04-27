//
// Copyright 2024 DXOS.org
//

import { type EditorView } from '@codemirror/view';

// Runtime data structure.
export type Range = {
  from: number;
  to: number;
};

// Persistent data structure.
// TODO(burdon): Rename annotation?
export type Comment = {
  id: string;
  cursor?: string;
};

/**
 * Callback that renders into a DOM element within the editor.
 */
export type RenderCallback<Props extends object> = (el: HTMLElement, props: Props, view: EditorView) => void;
