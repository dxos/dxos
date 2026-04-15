//
// Copyright 2024 DXOS.org
//

import React, { type PropsWithChildren } from 'react';

import { type ThemedClassName } from '@dxos/react-ui';
import { Json } from '@dxos/react-ui-syntax-highlighter';
import { composableProps, slottable } from '@dxos/ui-theme';

type TestLayoutProps = PropsWithChildren<{ json?: any }>;

export const TestLayout = ({ children, json }: TestLayoutProps) => {
  return (
    <div role='none' className='dx-container grid grid-cols-[1fr_1fr] p-4 gap-4'>
      <TestPanel>{children}</TestPanel>
      <TestPanel>
        <Json.Root data={json}>
          <Json.Content>
            <Json.Filter />
            <Json.Data testId='debug' classNames='text-xs' />
          </Json.Content>
        </Json.Root>
      </TestPanel>
    </div>
  );
};

type TestPanelProps = ThemedClassName<PropsWithChildren>;

const TestPanel = slottable<HTMLDivElement, TestPanelProps>(({ children }, forwardedRef) => {
  return (
    <div {...composableProps({ classNames: 'dx-container bg-modal-surface rounded-md' })} ref={forwardedRef}>
      {children}
    </div>
  );
});

// Symbol for accessing debug objects in tests.
export const VIEW_EDITOR_DEBUG_SYMBOL = Symbol('viewEditorDebug');
export const FIELD_EDITOR_DEBUG_SYMBOL = Symbol('fieldEditorDebug');
