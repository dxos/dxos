//
// Copyright 2023 DXOS.org
//

import React from 'react';

import { MarkdownProperties } from '../types';
import { StandaloneLayout } from './StandaloneLayout';

export const MarkdownMainEmpty = ({ data: [model, properties] }: { data: [any, MarkdownProperties] }) => {
  return (
    <StandaloneLayout model={model} properties={properties}>
      <model.content />
    </StandaloneLayout>
  );
};
