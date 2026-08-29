//
// Copyright 2025 DXOS.org
//

export { type EditorController, createEditorController, noopController } from './controller';
export { useEditorContext } from './EditorContext';

export * from './Editor';

// The context-free editor, paired with `useTextEditor`. `Editor.View` is the same component bound
// to `Editor.Root`'s toolbar context; a field that wants neither a toolbar nor a menu uses this.
export { EditorView as TextEditor, type EditorViewProps as TextEditorProps } from './EditorView';
