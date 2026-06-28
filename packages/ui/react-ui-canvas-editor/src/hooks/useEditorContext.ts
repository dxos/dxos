//
// Copyright 2024 DXOS.org
//

import { useContext } from 'react';

import { raise } from '@dxos/debug';

import { type EditorContextType, EditorContext } from './context';

// TODO(burdon): Split into more targetting groups to enable later factoring of concerns.
export const useEditorContext = (): EditorContextType => {
  return useContext(EditorContext) ?? raise(new Error('Missing EditorContext'));
};
