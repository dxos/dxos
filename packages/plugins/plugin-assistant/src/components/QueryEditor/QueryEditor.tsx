//
// Copyright 2025 DXOS.org
//

import React, { useMemo } from 'react';

import { type ThemedClassName, useThemeContext } from '@dxos/react-ui';
import { Editor, type Extension, createBasicExtensions, createThemeExtensions } from '@dxos/react-ui-editor';

export type QueryEditorProps = ThemedClassName<{}>;

export const QueryEditor = ({ classNames }: QueryEditorProps) => {
  const { themeMode } = useThemeContext();
  const extensions = useMemo<Extension[]>(
    () => [
      //
      createBasicExtensions({}),
      createThemeExtensions({ themeMode }),
    ],
    [],
  );

  return (
    <Editor
      id='query-editor'
      classNames={['p-2 border border-separator', classNames]}
      initialValue={'test'}
      extensions={extensions}
    />
  );
};
