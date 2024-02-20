//
// Copyright 2022 DXOS.org
//

export { type Extension, type EditorState } from '@codemirror/state';
export { type EditorView, keymap } from '@codemirror/view';

export { TextKind } from '@dxos/protocols/proto/dxos/echo/model/text';
export { Doc, YText, YXmlFragment } from '@dxos/text-model';

export * from './components';
export * from './extensions';
export * from './hooks';
export {
  getToken,
  editorWithToolbarLayout,
  editorFillLayoutEditor,
  editorFillLayoutRoot,
  editorHalfViewportOverscrollContent,
} from './styles';
export * from './themes';
export * from './util';
