//
// Copyright 2024 DXOS.org
//

import React, { type PropsWithChildren } from 'react';

import { type ThemedClassName } from '@dxos/react-ui';
import { composableProps, slottable } from '@dxos/react-ui';
import { Syntax } from '@dxos/react-ui-syntax-highlighter';
import { mx } from '@dxos/ui-theme';

type TestLayoutProps = PropsWithChildren<{ json?: unknown }>;

export const TestLayout = ({ children, json }: TestLayoutProps) => {
  return (
    <div className={mx('dx-container grid grid-cols-1 p-4 gap-4', !!json && 'grid-cols-[1fr_1fr]')}>
      <TestPanel>{children}</TestPanel>
      {!!json && (
        <TestPanel>
          <Syntax.Root data={json}>
            <Syntax.Content>
              <Syntax.Filter />
              <Syntax.Viewport>
                <Syntax.Code testId='debug' classNames='text-sm' />
              </Syntax.Viewport>
            </Syntax.Content>
          </Syntax.Root>
        </TestPanel>
      )}
    </div>
  );
};

type TestPanelProps = ThemedClassName<PropsWithChildren>;

export const TestPanel = slottable<HTMLDivElement, TestPanelProps>(({ children }, forwardedRef) => {
  return (
    <div {...composableProps({ classNames: 'dx-container dx-card-surface rounded-sm' })} ref={forwardedRef}>
      {children}
    </div>
  );
});

// Symbol for accessing debug objects in tests.
export const VIEW_EDITOR_DEBUG_SYMBOL = Symbol('viewEditorDebug');
export const FIELD_EDITOR_DEBUG_SYMBOL = Symbol('fieldEditorDebug');
export const OBJECT_PROPERTIES_DEBUG_SYMBOL = Symbol('objectPropertiesDebug');
