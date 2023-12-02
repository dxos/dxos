//
// Copyright 2023 DXOS.org
//

import React from 'react';

import { StandaloneLayout } from './StandaloneLayout';
import { type MarkdownProperties } from '../types';

export const MarkdownMainEmpty = ({ composer, properties }: { composer: any; properties: MarkdownProperties }) => {
  return (
    <StandaloneLayout model={composer} properties={properties}>
      <composer.content />
    </StandaloneLayout>
  );
};
