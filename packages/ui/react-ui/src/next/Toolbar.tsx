//
// Copyright 2026 DXOS.org
//

import { ark } from '@ark-ui/react/factory';
import { useMachine } from '@zag-js/react';
import React, { createContext, useContext, useId } from 'react';

import { composableProps, slottable } from '../util/index.ts';
import * as toolbar from './machines/toolbar.ts';
import { recipes } from './recipes.ts';
import { type Size } from './sizes.ts';

// Optional by design: a control outside a toolbar renders without roving props.
const ToolbarContext = createContext<toolbar.ToolbarApi | undefined>(undefined);

/** Roving-focus props for a control inside a Toolbar; empty outside one. */
export const useToolbarItem = (disabled?: boolean) => {
  const api = useContext(ToolbarContext);
  const value = useId();
  return api?.getItemProps({ value, disabled });
};

export type ToolbarProps = {
  size?: Size;
  orientation?: toolbar.Orientation;
};

/** `role=toolbar` with the roving focus that role promises (decision 9). */
export const Toolbar = slottable<HTMLDivElement, ToolbarProps>(
  ({ children, asChild, size, orientation = 'horizontal', ...props }, forwardedRef) => {
    const service = useMachine(toolbar.machine, { id: useId(), orientation });
    const api = toolbar.connect(service);
    const { className, ...rest } = composableProps(props, { classNames: recipes.toolbar() });
    return (
      <ToolbarContext.Provider value={api}>
        <ark.div
          asChild={asChild}
          {...rest}
          {...api.getRootProps()}
          data-size={size}
          className={className}
          ref={forwardedRef}
        >
          {children}
        </ark.div>
      </ToolbarContext.Provider>
    );
  },
);

Toolbar.displayName = 'Next.Toolbar';
