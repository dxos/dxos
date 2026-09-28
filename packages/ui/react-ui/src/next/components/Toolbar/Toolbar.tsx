//
// Copyright 2026 DXOS.org
//

import { ark } from '@ark-ui/react/factory';
import { useMachine } from '@zag-js/react';
import React, { createContext, forwardRef, useContext, useId } from 'react';

import { composable, composableProps, slottable } from '../../../util/index.ts';
import { recipes } from '../../recipes.ts';
import { type Size } from '../../sizes.ts';
import { Separator, type SeparatorProps } from '../Separator/index.ts';
import { ToggleGroup, type ToggleGroupRootProps } from '../ToggleGroup/index.ts';
import * as toolbar from './toolbar-machine.ts';

// Optional by design: a control outside a toolbar renders without roving props.
const ToolbarContext = createContext<toolbar.ToolbarApi | undefined>(undefined);

/** Roving-focus props for a control inside a Toolbar; empty outside one. */
export const useToolbarItem = (disabled?: boolean) => {
  const api = useContext(ToolbarContext);
  const value = useId();
  return api?.getItemProps({ value, disabled });
};

//
// Root
//

type ToolbarRootProps = {
  size?: Size;
  orientation?: toolbar.Orientation;
};

/** `role=toolbar` with the roving focus that role promises (decision 9). */
const ToolbarRoot = slottable<HTMLDivElement, ToolbarRootProps>(
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

ToolbarRoot.displayName = 'Next.Toolbar.Root';

//
// Separator
//

type ToolbarSeparatorProps = Omit<SeparatorProps, 'orientation'>;

/** A rule across the toolbar's axis (vertical in a horizontal toolbar); not an item, so roving focus skips it. */
const ToolbarSeparator = composable<HTMLDivElement, ToolbarSeparatorProps>((props, forwardedRef) => {
  const api = useContext(ToolbarContext);
  return (
    <Separator
      {...props}
      orientation={api?.orientation === 'vertical' ? 'horizontal' : 'vertical'}
      ref={forwardedRef}
    />
  );
});

ToolbarSeparator.displayName = 'Next.Toolbar.Separator';

//
// ToggleGroup
//

type ToolbarToggleGroupProps = ToggleGroupRootProps;

/** A ToggleGroup whose items join the toolbar's roving focus, so the group adds no tab stop or arrow handling of its own. */
const ToolbarToggleGroup = forwardRef<HTMLDivElement, ToolbarToggleGroupProps>((props, forwardedRef) => (
  <ToggleGroup.Root {...props} rovingFocus={false} ref={forwardedRef} />
));

ToolbarToggleGroup.displayName = 'Next.Toolbar.ToggleGroup';

export const Toolbar = {
  Root: ToolbarRoot,
  Separator: ToolbarSeparator,
  ToggleGroup: ToolbarToggleGroup,
  ToggleGroupItem: ToggleGroup.Item,
};

export type { ToolbarRootProps, ToolbarSeparatorProps, ToolbarToggleGroupProps };
