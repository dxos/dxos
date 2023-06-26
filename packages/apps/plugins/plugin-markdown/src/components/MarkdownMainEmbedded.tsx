//
// Copyright 2023 DXOS.org
//

import React from 'react';

import { ComposerModel } from '@dxos/aurora-composer';

import { MarkdownProperties } from '../props';
import { MarkdownMain } from './MarkdownMain';

export const MarkdownMainEmbedded = ({
  data: [model, properties, _],
}: {
  data: [ComposerModel, MarkdownProperties, 'embedded'];
  role?: string;
}) => {
  return <MarkdownMain model={model} properties={properties} layout='embedded' />;
};
