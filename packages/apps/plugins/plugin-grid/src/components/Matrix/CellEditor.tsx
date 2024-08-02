//
// Copyright 2024 DXOS.org
//

import React from 'react';

import { DocAccessor } from '@dxos/client/echo';
import { useThemeContext } from '@dxos/react-ui';
import { automerge, createBasicExtensions, createThemeExtensions, useTextEditor } from '@dxos/react-ui-editor';

import { cellExtension } from './cell-extension';

export type CellEditorProps = {
  accessor?: DocAccessor;
};

export const CellEditor = ({ accessor }: CellEditorProps) => {
  const { themeMode } = useThemeContext();
  const { parentRef } = useTextEditor(() => ({
    doc: accessor ? DocAccessor.getValue(accessor) : '',
    extensions: [
      accessor ? automerge(accessor) : [],
      createBasicExtensions({ placeholder: 'Enter value...' }),
      createThemeExtensions({ themeMode, slots: { content: { className: '!p-0' } } }),
      cellExtension,
    ],
  }));

  return <div ref={parentRef} />;
};
