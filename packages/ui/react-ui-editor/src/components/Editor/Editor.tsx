//
// Copyright 2025 DXOS.org
//

import { type EditorView } from '@codemirror/view';
import React, { forwardRef, useImperativeHandle } from 'react';

import { type ThemedClassName, useThemeContext } from '@dxos/react-ui';
import { mx } from '@dxos/react-ui-theme';
import { type DataType } from '@dxos/schema';

import { type UseTextEditorProps, useTextEditor } from '../../hooks';

export type EditorProps = ThemedClassName<
  {
    id: string;
    text: DataType.Text;
  } & Omit<UseTextEditorProps, 'id'>
>;

/**
 * Minimal text editor.
 */
export const Editor = forwardRef<EditorView | null, EditorProps>(({ classNames, id, text, ...props }, forwardedRef) => {
  const { themeMode } = useThemeContext();
  const { parentRef, focusAttributes, view } = useTextEditor(
    () => ({
      id,
      initialValue: text.content,
      ...props,
    }),
    [id, text, themeMode],
  );

  useImperativeHandle<EditorView | null, EditorView | null>(forwardedRef, () => view, [view]);
  return <div ref={parentRef} className={mx(classNames)} {...focusAttributes} />;
});
