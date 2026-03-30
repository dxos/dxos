//
// Copyright 2024 DXOS.org
//

import React, { type PropsWithChildren } from 'react';

import { Column, type ThemedClassName } from '@dxos/react-ui';
import { JsonFilter } from '@dxos/react-ui-syntax-highlighter';
import { mx } from '@dxos/ui-theme';

type TestLayoutProps = ThemedClassName<PropsWithChildren<{ json?: any }>>;

export const TestLayout = ({ classNames, children, json }: TestLayoutProps) => {
  return (
    <div className='w-full h-full grid grid-cols-[1fr_1fr] p-4 gap-4 overflow-hidden'>
      <TestPanel classNames={['dx-container', classNames]}>
        <Column.Root classNames='dx-container' gutter='sm'>
          {children}
        </Column.Root>
      </TestPanel>
      <TestPanel classNames={'overflow-hidden'}>
        <JsonFilter testId='debug' data={json} classNames='h-full text-xs' />
      </TestPanel>
    </div>
  );
};

type TestPanelProps = ThemedClassName<PropsWithChildren>;

const TestPanel = ({ classNames, children }: TestPanelProps) => {
  return (
    <div role='none' className={mx(['dx-document h-full bg-modal-surface rounded-md', classNames])}>
      {children}
    </div>
  );
};

// Symbol for accessing debug objects in tests.
export const VIEW_EDITOR_DEBUG_SYMBOL = Symbol('viewEditorDebug');
export const FIELD_EDITOR_DEBUG_SYMBOL = Symbol('fieldEditorDebug');
