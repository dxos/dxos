//
// Copyright 2024 DXOS.org
//

import { useContext } from 'react';

import { raise } from '@dxos/debug';

import { EditorContext, type EditorContextType } from './context';

export const useEditorContext = (): EditorContextType => {
  return useContext(EditorContext) ?? raise(new Error('Missing EditorContext'));
};
