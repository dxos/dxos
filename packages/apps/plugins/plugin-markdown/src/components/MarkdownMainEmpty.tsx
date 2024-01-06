//
// Copyright 2023 DXOS.org
//

import React from 'react';

import { StandaloneLayout } from './StandaloneLayout';
import { type MarkdownProperties } from '../types';

export const MarkdownMainEmpty = ({ content, properties }: { content?: string; properties: MarkdownProperties }) => {
  return <StandaloneLayout properties={properties}>{content}</StandaloneLayout>;
};
