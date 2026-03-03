//
// Copyright 2022 DXOS.org
//

export { type Extension, EditorState } from '@codemirror/state';
export { EditorView, keymap } from '@codemirror/view';
export { tags } from '@lezer/highlight';

export { TextKind } from '@dxos/protocols/proto/dxos/echo/model/text';

export * from './defaults';
export * from './extensions';
export * from './types';
export * from './util';
