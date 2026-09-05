//
// Copyright 2024 DXOS.org
//

import { ark } from '@ark-ui/react/factory';
import { Tabs as TabsPrimitive } from '@ark-ui/react/tabs';
import React, { type ComponentPropsWithoutRef, type MouseEvent, useCallback, useLayoutEffect } from 'react';

import { findFirstFocusable } from '@dxos/react-focus';
import { createContext, useControllableState } from '@dxos/react-hooks';
import {
  Button,
  type ButtonProps,
  IconButton,
  type IconButtonProps,
  type SlottableProps,
  type ThemedClassName,
  composableProps,
  slottable,
  useForwardedRef,
} from '@dxos/react-ui';
import { useAttention } from '@dxos/react-ui-attention';
import { mx } from '@dxos/ui-theme';

// TODO(burdon): Rewrite this; there are too many hacks/quirks.

type TabsActivePart = 'list' | 'panel';

type TabsOrientation = 'horizontal' | 'vertical';

const TABS_NAME = 'Tabs';

//
// Context
//

type TabsContextValue = {
  activePart: TabsActivePart;
  setActivePart: (nextActivePart: TabsActivePart) => void;
  attendableId?: string;
} & {
  orientation?: TabsOrientation;
  value?: string;
};

const [TabsContextProvider, useTabsContext] = createContext<TabsContextValue>(TABS_NAME, {
  orientation: 'vertical',
  activePart: 'list',
  setActivePart: () => {},
});

//
// Root
//

type TabsRootCustomProps = Omit<ComponentPropsWithoutRef<'div'>, 'defaultValue' | 'dir'> & {
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  orientation?: TabsOrientation;
  /** `manual`: a tab activates on click or Enter; `automatic`: on focus. */
  activationMode?: 'automatic' | 'manual';
  /** Keep inactive panels mounted (hidden) instead of unmounting them. */
  keepMounted?: boolean;
} & Partial<
    Pick<TabsContextValue, 'activePart' | 'attendableId'> & {
      onActivePartChange: (nextActivePart: TabsActivePart) => void;
      defaultActivePart: TabsActivePart;
      /** Skip master-detail focus moves (e.g. when a child form owns initial focus). */
      suppressRegionFocus?: boolean;
    }
  >;

type TabsRootProps = SlottableProps<TabsRootCustomProps>;

const TabsRoot = slottable<HTMLDivElement, TabsRootCustomProps>(
  (
    {
      children,
      activePart: propsActivePart,
      onActivePartChange,
      defaultActivePart,
      value: propsValue,
      onValueChange,
      defaultValue,
      orientation = 'vertical',
      activationMode = 'manual',
      keepMounted = false,
      attendableId,
      suppressRegionFocus = false,
      asChild,
      ...props
    },
    forwardedRef,
  ) => {
    const tabsRoot = useForwardedRef(forwardedRef);

    const [activePart = 'list', setActivePart] = useControllableState({
      prop: propsActivePart,
      onChange: onActivePartChange,
      defaultProp: defaultActivePart,
    });

    const [value, setValue] = useControllableState({
      prop: propsValue,
      onChange: onValueChange,
      defaultProp: defaultValue,
    });

    const handleValueChange = useCallback(
      (nextValue: string) => {
        setActivePart('panel');
        setValue(nextValue);
      },
      [value],
    );

    useLayoutEffect(() => {
      if (suppressRegionFocus) {
        return;
      }

      const root = tabsRoot.current;
      if (!root) {
        return;
      }

      if (activePart === 'list') {
        const tablist = root.querySelector<HTMLElement>('[role="tablist"]');
        findFirstFocusable(tablist)?.focus();
        return;
      }

      const panel = root.querySelector<HTMLElement>('[role="tabpanel"][data-selected]');
      if (!panel) {
        return;
      }

      // The machine marks the selected panel focusable; `findFirstFocusable` skips the container
      // itself, so the panel's content receives focus rather than the panel.
      findFirstFocusable(panel)?.focus();
    }, [activePart, value, suppressRegionFocus]);

    return (
      <TabsContextProvider
        orientation={orientation}
        activePart={activePart}
        setActivePart={setActivePart}
        value={value}
        attendableId={attendableId}
      >
        <TabsPrimitive.Root
          {...composableProps<HTMLDivElement>(props)}
          asChild={asChild}
          orientation={orientation}
          activationMode={activationMode}
          data-active={activePart}
          value={value ?? null}
          onValueChange={({ value }) => handleValueChange(value)}
          // Inactive panels unmount unless asked otherwise: their content re-runs its effects on
          // activation, which the panel focus move above relies on.
          unmountOnExit={!keepMounted}
          ref={tabsRoot}
        >
          {children}
        </TabsPrimitive.Root>
      </TabsContextProvider>
    );
  },
);

TabsRoot.displayName = 'Tabs.Root';

//
// Viewport
//

type TabsViewportProps = SlottableProps<
  Omit<ComponentPropsWithoutRef<'div'>, 'className' | 'style' | 'children' | 'role'>
>;

const TabsViewport = slottable<
  HTMLDivElement,
  Omit<ComponentPropsWithoutRef<'div'>, 'className' | 'style' | 'children' | 'role'>
>(({ children, asChild, ...props }, forwardedRef) => {
  const { activePart } = useTabsContext('TabsViewport');
  return (
    <ark.div asChild={asChild} {...composableProps<HTMLDivElement>(props)} data-active={activePart} ref={forwardedRef}>
      {children}
    </ark.div>
  );
});

TabsViewport.displayName = 'Tabs.Viewport';

//
// Tablist
//

type TabsTablistProps = ThemedClassName<ComponentPropsWithoutRef<'div'>>;

const TabsTablist = ({ children, classNames, ...props }: TabsTablistProps) => {
  const { orientation } = useTabsContext('TabsTablist');
  return (
    <TabsPrimitive.List
      {...props}
      data-arrow-keys={orientation === 'vertical' ? 'up down' : 'left right'}
      className={mx(
        'max-h-full w-full',
        // TODO(burdon): Should be embeddable inside Toolbar (if horizontal).
        orientation === 'vertical' ? 'overflow-y-auto' : 'flex p-1 gap-1 items-stretch justify-start overflow-x-auto',
        classNames,
      )}
    >
      {children}
    </TabsPrimitive.List>
  );
};

TabsTablist.displayName = 'Tabs.Tablist';

//
// BackButton
//

const TabsBackButton = ({ onClick, classNames, ...props }: ButtonProps) => {
  const { setActivePart } = useTabsContext('TabsBackButton');
  const handleClick = useCallback(
    (event: MouseEvent<HTMLButtonElement>) => {
      setActivePart('list');
      return onClick?.(event);
    },
    [setActivePart, onClick],
  );

  return <Button {...props} classNames={['@md:hidden text-start', classNames]} onClick={handleClick} />;
};

TabsBackButton.displayName = 'Tabs.BackButton';

//
// TabGroupHeading
//

type TabsTabGroupHeadingProps = ThemedClassName<ComponentPropsWithoutRef<'h2'>>;

const TabsTabGroupHeading = ({ children, classNames, ...props }: TabsTabGroupHeadingProps) => (
  <h2 {...props} className={mx('my-1 px-2 text-sm text-un-accent', classNames)}>
    {children}
  </h2>
);

TabsTabGroupHeading.displayName = 'Tabs.TabGroupHeading';

//
// Tab
//

type TabsButtonProps = ButtonProps & { value: string };

const TabsButton = ({ value, classNames, children, onClick, variant, ...props }: TabsButtonProps) => {
  const { setActivePart, orientation, value: contextValue, attendableId } = useTabsContext('TabsButton');
  const { hasAttention } = useAttention(attendableId);

  const handleClick = useCallback(
    // NOTE: This handler is only called if the tab is *already active*.
    (event: MouseEvent<HTMLButtonElement>) => {
      setActivePart('panel');
      onClick?.(event);
    },
    [setActivePart, onClick],
  );

  return (
    <TabsPrimitive.Trigger value={value} asChild>
      <Button
        {...props}
        variant={
          variant ??
          (orientation === 'horizontal' && contextValue === value ? (hasAttention ? 'primary' : 'default') : 'ghost')
        }
        classNames={[
          orientation === 'vertical' && 'block justify-start text-start w-full',
          orientation === 'vertical' && 'dx-selected',
          classNames,
        ]}
        onClick={handleClick}
      >
        {children}
      </Button>
    </TabsPrimitive.Trigger>
  );
};

TabsButton.displayName = 'Tabs.Button';

//
// IconButton
//

type TabsIconButtonProps = IconButtonProps & { value: string };

const TabsIconButton = ({ value, classNames, onClick, variant, iconOnly, ...props }: TabsIconButtonProps) => {
  const { setActivePart, orientation, value: contextValue, attendableId } = useTabsContext('TabsIconButton');
  const { hasAttention } = useAttention(attendableId);

  // NOTE: This handler is only called if the tab is *already active*.
  const handleClick = useCallback(
    (event: MouseEvent<HTMLButtonElement>) => {
      setActivePart('panel');
      onClick?.(event);
    },
    [setActivePart, onClick],
  );

  return (
    <TabsPrimitive.Trigger value={value} asChild>
      <IconButton
        {...props}
        iconOnly={iconOnly}
        variant={
          variant ??
          (orientation === 'horizontal' && contextValue === value ? (hasAttention ? 'primary' : 'default') : 'ghost')
        }
        classNames={[
          orientation === 'vertical' && !iconOnly && 'justify-start text-start w-full',
          orientation === 'vertical' && 'dx-selected',
          classNames,
        ]}
        onClick={handleClick}
      />
    </TabsPrimitive.Trigger>
  );
};

TabsIconButton.displayName = 'Tabs.IconButton';

//
// Panel
//
// Do NOT wrap TabsPanel children in React.Activity.

type TabsPanelProps = ThemedClassName<ComponentPropsWithoutRef<'div'> & { value: string }>;

const TabsPanel = ({ classNames, children, ...props }: TabsPanelProps) => (
  <TabsPrimitive.Content {...props} className={mx('p-0! dx-focus-ring-inset-over-all', classNames)}>
    {children}
  </TabsPrimitive.Content>
);

TabsPanel.displayName = 'Tabs.Panel';

type TabsTabPrimitiveProps = ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger>;

//
// Tabs
//

export const Tabs = {
  Root: TabsRoot,
  Tablist: TabsTablist,
  Button: TabsButton,
  IconButton: TabsIconButton,
  TabPrimitive: TabsPrimitive.Trigger,
  TabGroupHeading: TabsTabGroupHeading,
  Viewport: TabsViewport,
  Panel: TabsPanel,
  BackButton: TabsBackButton,
};

export type {
  TabsActivePart,
  TabsButtonProps,
  TabsIconButtonProps,
  TabsPanelProps,
  TabsRootProps,
  TabsTabGroupHeadingProps,
  TabsTablistProps,
  TabsTabPrimitiveProps,
  TabsViewportProps,
};
