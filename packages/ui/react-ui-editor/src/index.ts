//
// Copyright 2022 DXOS.org
//

import translations from './translations';

export { type Extension, type EditorState } from '@codemirror/state';
export { type EditorView, keymap } from '@codemirror/view';
export { tags } from '@lezer/highlight';

export { TextKind } from '@dxos/protocols/proto/dxos/echo/model/text';

export * from './components';
export * from './extensions';
export * from './hooks';
export { getToken, editorWithToolbarLayout, editorFillLayoutRoot, editorFillLayoutEditor } from './styles';
export * from './themes';
export * from './util';
export { translations };
