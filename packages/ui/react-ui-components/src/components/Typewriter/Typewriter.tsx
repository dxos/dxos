//
// Copyright 2025 DXOS.org
//

import React from 'react';

import { type ThemedClassName } from '@dxos/react-ui';
import { mx } from '@dxos/react-ui-theme';

import { MarkdownViewer } from '..';
import { useStreamingText } from '../../hooks';

export type TypewriterProps = ThemedClassName<{
  text: string;
  cps?: number;
}>;

// TODO(burdon): Parse into blocks so not constantly re-rendering everything.

export const Typewriter = ({ classNames, text, cps }: TypewriterProps) => {
  const [str, blink] = useStreamingText(text, cps);
  return (
    <div className={mx('inline-block', classNames)}>
      <MarkdownViewer content={str}>
        <Cursor blink={blink} />
      </MarkdownViewer>
    </div>
  );
};

export const Cursor = ({ blink }: { blink?: boolean }) => (
  <span className={mx('ml-1', blink && 'animate-blink')}>▌</span>
);
