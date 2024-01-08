//
// Copyright 2023 DXOS.org
//

import React from 'react';

import { StandaloneLayout } from './StandaloneLayout';

export const MarkdownMainEmpty = ({ content }: { content?: string }) => {
  return <StandaloneLayout>{content}</StandaloneLayout>;
};
