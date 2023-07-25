//
// Copyright 2023 DXOS.org
//

import React from 'react';

import { ComposerModel } from '@dxos/aurora-composer';

import { MarkdownProperties } from '../types';
import { MarkdownMain } from './MarkdownMain';

export const MarkdownMainEmbedded = ({
  data: { composer, properties },
}: {
  data: { composer: ComposerModel; properties: MarkdownProperties; view: 'embedded' };
  role?: string;
}) => {
  return <MarkdownMain model={composer} properties={properties} layout='embedded' />;
};
