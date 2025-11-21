//
// Copyright 2022 DXOS.org
//

import { translations } from './translations';

export * from './components';
export * from './defaults';
export * from './extensions';
export * from './hooks';
export * from './types';
export * from './util';
export { EditorState, type Extension } from '@codemirror/state';
export { EditorView, keymap } from '@codemirror/view';
export { TextKind } from '@dxos/protocols/proto/dxos/echo/model/text';
export { tags } from '@lezer/highlight';

export { translations };
