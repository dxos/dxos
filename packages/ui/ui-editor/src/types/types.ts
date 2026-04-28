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
export const EditorViewMode = Schema.Union(
  Schema.Literal('preview').annotations({ title: 'Preview' }),
  Schema.Literal('readonly').annotations({ title: 'Read-only' }),
  Schema.Literal('source').annotations({ title: 'Source' }),
);
export type EditorViewMode = Schema.Schema.Type<typeof EditorViewMode>;

export const EditorInputModes = ['default', 'vim', 'vscode'] as const;
export const EditorInputMode = Schema.Union(
  Schema.Literal('default').annotations({ title: 'Default' }),
  Schema.Literal('vim').annotations({ title: 'Vim' }),
  Schema.Literal('vscode').annotations({ title: 'VS Code' }),
);
export type EditorInputMode = Schema.Schema.Type<typeof EditorInputMode>;
