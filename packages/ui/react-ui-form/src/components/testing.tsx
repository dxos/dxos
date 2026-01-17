//
// Copyright 2024 DXOS.org
//

import React, { type PropsWithChildren } from 'react';

import { type ThemedClassName } from '@dxos/react-ui';
import { Card } from '@dxos/react-ui-mosaic';
import { JsonFilter } from '@dxos/react-ui-syntax-highlighter';
import { textBlockWidth } from '@dxos/ui-theme';

type TestLayoutProps = ThemedClassName<PropsWithChildren<{ json?: any }>>;

export const TestLayout = ({ classNames, children, json }: TestLayoutProps) => {
  return (
    <div className='is-full bs-full grid grid-cols-[1fr_1fr] p-4 gap-4 overflow-hidden'>
      <TestPanel classNames={['flex flex-col bs-full overflow-y-auto', classNames]}>{children}</TestPanel>
      <TestPanel classNames={'overflow-hidden'}>
        <JsonFilter testId='debug' data={json} classNames='bs-full text-xs' />
      </TestPanel>
    </div>
  );
};

type TestPanelProps = ThemedClassName<PropsWithChildren>;

const TestPanel = ({ classNames, children }: TestPanelProps) => {
  return <Card.Root classNames={['bs-full overflow-y-auto', textBlockWidth, classNames]}>{children}</Card.Root>;
};

// Symbol for accessing debug objects in tests.
export const VIEW_EDITOR_DEBUG_SYMBOL = Symbol('viewEditorDebug');
export const FIELD_EDITOR_DEBUG_SYMBOL = Symbol('fieldEditorDebug');
