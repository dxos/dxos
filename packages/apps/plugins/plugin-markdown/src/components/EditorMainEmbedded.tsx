//
// Copyright 2023 DXOS.org
//

import React from 'react';

import { type EditorModel } from '@dxos/react-ui-editor';

import { EditorMain } from './EditorMain';
import { EmbeddedLayout } from './EmbeddedLayout';

export const EditorMainEmbedded = ({ model }: { model: EditorModel }) => {
  return (
    <EmbeddedLayout>
      <EditorMain model={model} />
    </EmbeddedLayout>
  );
};
