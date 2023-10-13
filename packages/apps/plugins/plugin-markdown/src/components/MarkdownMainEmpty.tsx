//
// Copyright 2023 DXOS.org
//

import React from 'react';

import { StandaloneLayout } from './StandaloneLayout';
import { type MarkdownProperties } from '../types';

export const MarkdownMainEmpty = ({
  data: { composer, properties },
}: {
  data: { composer: any; properties: MarkdownProperties };
}) => {
  return (
    <StandaloneLayout model={composer} properties={properties}>
      <composer.content />
    </StandaloneLayout>
  );
};
