//
// Copyright 2024 DXOS.org
//

import { EditorView } from '@codemirror/view';
import React, { type DOMAttributes } from 'react';

import { DocAccessor } from '@dxos/client/echo';
import { useThemeContext } from '@dxos/react-ui';
import {
  automerge,
  createBasicExtensions,
  createThemeExtensions,
  preventNewline,
  useTextEditor,
} from '@dxos/react-ui-editor';

import { cellExtension } from './cell-extension';

export type CellEditorProps = {
  accessor?: DocAccessor;
  autoFocus?: boolean;
} & Pick<DOMAttributes<HTMLInputElement>, 'onBlur' | 'onKeyDown'>;

export const CellEditor = ({ accessor, autoFocus, onBlur, onKeyDown }: CellEditorProps) => {
  const { themeMode } = useThemeContext();
  const { parentRef } = useTextEditor(() => ({
    autoFocus,
    doc: accessor ? DocAccessor.getValue(accessor) : '',
    extensions: [
      accessor ? automerge(accessor) : [],
      EditorView.domEventHandlers({
        blur: onBlur as any,
        keydown: onKeyDown as any,
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
