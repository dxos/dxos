//
// Copyright 2022 DXOS.org
//

export { EditorState, type Extension } from '@codemirror/state';
export { EditorView, keymap } from '@codemirror/view';
export { tags } from '@lezer/highlight';

export * from './defaults.ts';
export * from './extensions/index.ts';
export * from './util/index.ts';
