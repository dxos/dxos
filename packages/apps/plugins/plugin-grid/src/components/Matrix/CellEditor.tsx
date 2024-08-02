//
// Copyright 2024 DXOS.org
//

import React from 'react';

import { type DocAccessor } from '@dxos/client/echo';
import { useThemeContext } from '@dxos/react-ui';
import { automerge, createBasicExtensions, createThemeExtensions, useTextEditor } from '@dxos/react-ui-editor';

export type CellEditorProps = {
  accessor: DocAccessor;
};

export const CellEditor = ({ accessor }: CellEditorProps) => {
  const { themeMode } = useThemeContext();
  const { parentRef } = useTextEditor(() => ({
    extensions: [
      //
      automerge(accessor),
      createBasicExtensions({ placeholder: 'Enter value...' }),
      createThemeExtensions({ themeMode }),
    ],
  }));

  return <div ref={parentRef} />;
};
