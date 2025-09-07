//
// Copyright 2025 DXOS.org
//

import React from 'react';

import { type ThemedClassName } from '@dxos/react-ui';
import { mx } from '@dxos/react-ui-theme';

import { useStreamingText } from '../../hooks';
import { MarkdownViewer } from '../MarkdownViewer';

export type TypewriterProps = ThemedClassName<{
  text: string;
  cps?: number;
}>;

export const Typewriter = ({ classNames, text, cps }: TypewriterProps) => {
  const [str] = useStreamingText(text, cps);
  return (
    <div className={mx('inline-block', classNames)}>
      <MarkdownViewer content={str} />
    </div>
  );
};

export const Cursor = ({ blink }: { blink?: boolean }) => (
  <span className={mx('ml-1', blink && 'animate-blink')}>▌</span>
);
