//
// Copyright 2024 DXOS.org
//

import { useContext } from 'react';

import { raise } from '@dxos/debug';

import { EditorContext, type EditorContextType } from './context';

// TODO(burdon): Split into more targetting groups to enable later factoring of concerns.
export const useEditorContext = (): EditorContextType =>
  useContext(EditorContext) ?? raise(new Error('Missing EditorContext'));
