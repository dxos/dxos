//
// Copyright 2024 DXOS.org
//

import { EditorView } from '@codemirror/view';
import React, { type DOMAttributes } from 'react';

import { DocAccessor } from '@dxos/client/echo';
import { useThemeContext } from '@dxos/react-ui';
import { createBasicExtensions, createThemeExtensions, preventNewline, useTextEditor } from '@dxos/react-ui-editor';

import { cellExtension } from './cell-extension';

export type CellEditorProps = {
  autoFocus?: boolean;
  // TODO(burdon): Use DocAccessor to access Automerge document directly (in real time?)
  accessor?: DocAccessor;
  value?: string;
  onChange?: (text: string) => void;
} & Pick<DOMAttributes<HTMLInputElement>, 'onBlur' | 'onKeyDown'>;

export const CellEditor = ({ accessor, autoFocus, value, onChange, onBlur, onKeyDown }: CellEditorProps) => {
  const { themeMode } = useThemeContext();
  const { parentRef } = useTextEditor(() => ({
    autoFocus,
    doc: value !== undefined ? value : accessor !== undefined ? DocAccessor.getValue(accessor) : '',
    extensions: [
      // accessor ? automerge(accessor) : [],
      EditorView.domEventHandlers({
        blur: onBlur as any,
        keydown: onKeyDown as any,
      }),
      EditorView.updateListener.of((update) => {
        onChange?.(update.state.doc.toString());
      }),
      createBasicExtensions({ placeholder: 'Enter value...' }),
      createThemeExtensions({
        themeMode,
        slots: { content: { className: '!p-1 border border-transparent focus:border-primary-500' } },
      }),
      preventNewline,
      cellExtension,
    ],
  }));

  return <div ref={parentRef} />;
};
