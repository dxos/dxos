//
// Copyright 2023 DXOS.org
//

import React from 'react';

import { type EditorModel } from '@dxos/react-ui-editor';

import { EditorMain } from './EditorMain';
import { type MarkdownProperties } from '../types';

export const EditorMainEmbedded = ({
  composer,
  properties,
}: {
  composer: EditorModel;
  properties: MarkdownProperties;
}) => {
  return <EditorMain model={composer} properties={properties} layout='embedded' />;
};
