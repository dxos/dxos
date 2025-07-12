//
// Copyright 2022 DXOS.org
//

import { translations } from './translations';

export { type Extension, EditorState } from '@codemirror/state';
export { EditorView, keymap } from '@codemirror/view';
export { tags } from '@lezer/highlight';

export { TextKind } from '@dxos/protocols/proto/dxos/echo/model/text';

export * from './components';
export * from './defaults';
export * from './extensions';
export * from './hooks';
export * from './types/types';
export * from './util';

export { translations };
