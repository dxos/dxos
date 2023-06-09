//
// Copyright 2023 DXOS.org
//

import { Dispatch, SetStateAction } from 'react';

import { Document } from '@braneframe/types';
import { Space } from '@dxos/client';

export type EditorViewState = 'editor' | 'preview';

export type OutletContext = {
  space?: Space;
  document?: Document;
  layout: 'standalone' | 'embedded';
  editorViewState: EditorViewState;
  setEditorViewState: Dispatch<SetStateAction<EditorViewState>>;
};
