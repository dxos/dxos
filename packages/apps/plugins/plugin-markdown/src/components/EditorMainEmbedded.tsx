//
// Copyright 2023 DXOS.org
//

import React from 'react';

import { type ComposerModel } from '@dxos/aurora-composer';

import { EditorMain } from './EditorMain';
import { type MarkdownProperties } from '../types';

export const EditorMainEmbedded = ({
  data: { composer, properties },
}: {
  data: { composer: ComposerModel; properties: MarkdownProperties; view: 'embedded' };
  role?: string;
}) => {
  return <EditorMain model={composer} properties={properties} layout='embedded' editorRefCb={() => {}} />;
};
