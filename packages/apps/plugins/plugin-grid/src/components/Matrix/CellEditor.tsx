//
// Copyright 2024 DXOS.org
//

import React from 'react';

import { DocAccessor } from '@dxos/client/echo';
import { useThemeContext } from '@dxos/react-ui';
import { automerge, createBasicExtensions, createThemeExtensions, useTextEditor } from '@dxos/react-ui-editor';
import { getDeep } from '@dxos/util';

export type CellEditorProps = {
  accessor: DocAccessor;
};

export const CellEditor = ({ accessor }: CellEditorProps) => {
  const { themeMode } = useThemeContext();
  const { parentRef } = useTextEditor(() => ({
<<<<<<< HEAD
    doc: DocAccessor.getValue(accessor),
=======
    doc: getDeep(accessor.handle.docSync(), accessor.path) as string,
>>>>>>> 5c078a0cf2dea041ef80abf8801c37a62ef61f17
    extensions: [
      //
      automerge(accessor),
      createBasicExtensions({ placeholder: 'Enter value...' }),
      createThemeExtensions({ themeMode }),
    ],
  }));

  return <div ref={parentRef} />;
};
