//
// Copyright 2024 DXOS.org
//

import React, { type PropsWithChildren } from 'react';

import { type ThemedClassName } from '@dxos/react-ui';
import { Card } from '@dxos/react-ui-stack';
import { JsonFilter } from '@dxos/react-ui-syntax-highlighter';
import { mx, textBlockWidth } from '@dxos/react-ui-theme';

export const TestLayout = ({ classNames, json, children }: ThemedClassName<PropsWithChildren<{ json?: any }>>) => (
  <div className='w-full h-full grid grid-cols-[1fr_1fr] gap-2 overflow-hidden'>
    <div className={mx('p-4 justify-center overflow-y-auto', classNames)}>{children}</div>
    <JsonFilter data={json} classNames='w-full text-xs' testId='debug' />
  </div>
);

export const TestPanel = ({ classNames, children }: ThemedClassName<PropsWithChildren>) => (
  <Card.StaticRoot classNames={[textBlockWidth, classNames]}>{children}</Card.StaticRoot>
);

// Symbol for accessing debug objects in tests.
export const VIEW_EDITOR_DEBUG_SYMBOL = Symbol('viewEditorDebug');
export const FIELD_EDITOR_DEBUG_SYMBOL = Symbol('fieldEditorDebug');
