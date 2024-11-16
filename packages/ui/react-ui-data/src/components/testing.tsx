//
// Copyright 2024 DXOS.org
//

import React, { type PropsWithChildren } from 'react';

import { type ThemedClassName } from '@dxos/react-ui';
import { SyntaxHighlighter } from '@dxos/react-ui-syntax-highlighter';
import { mx } from '@dxos/react-ui-theme';

export const TestPanel = ({ classNames, children }: ThemedClassName<PropsWithChildren>) => (
  <div role='none'>
    <div className={mx('flex flex-col border border-separator rounded w-[300px]', classNames)}>{children}</div>
  </div>
);

export const TestLayout = ({ classNames, json, children }: ThemedClassName<PropsWithChildren<{ json?: any }>>) => (
  <div className='w-full h-full grid grid-cols-3'>
    <div className={mx('flex col-span-2 w-full justify-center p-4', classNames)}>{children}</div>
    <SyntaxHighlighter language='json' className='w-full text-xs font-thin'>
      {JSON.stringify(json, null, 2)}
    </SyntaxHighlighter>
  </div>
);
