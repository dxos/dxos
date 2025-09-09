//
// Copyright 2025 DXOS.org
//

import React from 'react';

import { type ThemedClassName } from '@dxos/react-ui';

import { useStreamingText } from '../../hooks';

import { MarkdownContent, type MarkdownContentProps } from './MarkdownContent';

export type MarkdownStreamProps = ThemedClassName<
  MarkdownContentProps & {
    cps?: number;
  }
>;

export const MarkdownStream = ({ classNames, content, cps, ...props }: MarkdownStreamProps) => {
  const [str] = useStreamingText(content, cps);
  return <MarkdownContent classNames={classNames} content={str} {...props} />;
};
