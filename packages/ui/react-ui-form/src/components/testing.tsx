//
// Copyright 2024 DXOS.org
//

import React, { type PropsWithChildren } from 'react';

import { type ThemedClassName } from '@dxos/react-ui';
import { JsonFilter } from '@dxos/react-ui-syntax-highlighter';
import { mx } from '@dxos/react-ui-theme';

export const TestPanel = ({ classNames, children }: ThemedClassName<PropsWithChildren>) => (
  <div className={mx('w-full max-w-[30rem] border border-separator p-2 rounded', classNames)}>{children}</div>
);

export const TestLayout = ({ classNames, json, children }: ThemedClassName<PropsWithChildren<{ json?: any }>>) => (
  <div className='w-full h-full grid grid-cols-[1fr_1fr]'>
    <div className={mx('m-2 justify-center overflow-y-auto', classNames)}>{children}</div>
    <JsonFilter data={json} classNames='w-full text-xs' />
  </div>
);
