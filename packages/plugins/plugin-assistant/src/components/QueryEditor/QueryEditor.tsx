//
// Copyright 2025 DXOS.org
//

import React, { useMemo } from 'react';

import { type ThemedClassName, useThemeContext } from '@dxos/react-ui';
import { Editor, type Extension, createBasicExtensions, createThemeExtensions } from '@dxos/react-ui-editor';

import { query } from './query-extension';

export type QueryEditorProps = ThemedClassName<{ text?: string }>;

export const QueryEditor = ({ classNames, text }: QueryEditorProps) => {
  const { themeMode } = useThemeContext();
  const extensions = useMemo<Extension[]>(
    () => [
      //
      createBasicExtensions({}),
      createThemeExtensions({ themeMode }),
      query(),
    ],
    [],
  );

  return <Editor id='query-editor' classNames={['p-2', classNames]} initialValue={text} extensions={extensions} />;
};
