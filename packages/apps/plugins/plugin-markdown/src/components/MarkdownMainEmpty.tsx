//
// Copyright 2023 DXOS.org
//

import React from 'react';

import { StandaloneLayout } from './StandaloneLayout';
import { type MarkdownProperties } from '../types';

export const MarkdownMainEmpty = ({ model, properties }: { model: any; properties: MarkdownProperties }) => {
  return (
    <StandaloneLayout properties={properties}>
      <model.content />
    </StandaloneLayout>
  );
};
