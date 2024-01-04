//
// Copyright 2023 DXOS.org
//

import React from 'react';

import { StandaloneLayout } from './StandaloneLayout';
import { type MarkdownProperties } from '../types';

export const MarkdownMainEmpty = ({ model, properties }: { model: any; properties: MarkdownProperties }) => {
  return (
    <StandaloneLayout model={model} properties={properties}>
      <model.content />
    </StandaloneLayout>
  );
};
