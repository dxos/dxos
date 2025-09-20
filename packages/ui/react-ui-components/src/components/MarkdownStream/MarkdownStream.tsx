//
// Copyright 2025 DXOS.org
//

import React, { useEffect } from 'react';

import { mx } from '@dxos/react-ui-theme';

import { type MarkdownStreamProps } from './types';
import { useMarkdownStream } from './useMarkdownStream';

export const MarkdownStream = ({ classNames, ...props }: MarkdownStreamProps) => {
  const { parentRef } = useMarkdownStream(props);
  useEffect(() => () => console.log('[markdown stream unmount]'), []);
  return <div ref={parentRef} className={mx('is-full overflow-hidden', classNames)} />;
};
