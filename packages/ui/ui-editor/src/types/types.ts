//
// Copyright 2024 DXOS.org
//

import { type EditorView } from '@codemirror/view';
import * as Schema from 'effect/Schema';

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

export const EditorViewModes = ['preview', 'readonly', 'source'] as const;
export const EditorViewMode = Schema.Union(...EditorViewModes.map((mode) => Schema.Literal(mode)));
export type EditorViewMode = Schema.Schema.Type<typeof EditorViewMode>;

export const EditorInputModes = ['default', 'vim', 'vscode'] as const;
export const EditorInputMode = Schema.Union(...EditorInputModes.map((mode) => Schema.Literal(mode)));
export type EditorInputMode = Schema.Schema.Type<typeof EditorInputMode>;
