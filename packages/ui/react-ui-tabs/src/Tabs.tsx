//
// Copyright 2024 DXOS.org
//

import { useArrowNavigationGroup, useFocusableGroup, useFocusFinders } from '@fluentui/react-tabster';
import { createContext } from '@radix-ui/react-context';
import { Slot } from '@radix-ui/react-slot';
import * as TabsPrimitive from '@radix-ui/react-tabs';
import { useControllableState } from '@radix-ui/react-use-controllable-state';
import React, { type ComponentPropsWithoutRef, type MouseEvent, useCallback, useLayoutEffect } from 'react';

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

const TABS_NAME = 'Tabs';

//
// Context
//

type TabsContextValue = {
  activePart: TabsActivePart;
  setActivePart: (nextActivePart: TabsActivePart) => void;
  attendableId?: string;
} & Pick<TabsPrimitive.TabsProps, 'orientation' | 'value'>;

const [TabsContextProvider, useTabsContext] = createContext<TabsContextValue>(TABS_NAME, {
  orientation: 'vertical',
  activePart: 'list',
  setActivePart: () => {},
});

//
// Root
//

type TabsRootCustomProps = TabsPrimitive.TabsProps &
  Partial<
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
      attendableId,
      suppressRegionFocus = false,
      asChild,
      ...props
    },
    forwardedRef,
  ) => {
    const tabsRoot = useForwardedRef(forwardedRef);

    // TODO(thure): Without these, we get Groupper/Mover `API used before initialization`, but why?
    useArrowNavigationGroup();
    useFocusableGroup();
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

    const { findFirstFocusable, findNextFocusable } = useFocusFinders();

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

      const panel = root.querySelector<HTMLElement>('[role="tabpanel"][data-state="active"]');
      if (!panel) {
        return;
      }

      // Radix marks the active panel focusable for roving tabindex; skip it so content receives focus.
      let target = findFirstFocusable(panel);
      if (target === panel) {
        target = findNextFocusable(panel, { container: panel }) ?? undefined;
      }
      target?.focus();
    }, [activePart, value, findFirstFocusable, findNextFocusable, suppressRegionFocus]);

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
          value={value}
          onValueChange={handleValueChange}
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
  const Comp = asChild ? Slot : 'div';
  return (
    <Comp {...composableProps<HTMLDivElement>(props)} data-active={activePart} ref={forwardedRef}>
      {children}
    </Comp>
  );
});

TabsViewport.displayName = 'Tabs.Viewport';

//
// Tablist
//

type TabsTablistProps = ThemedClassName<TabsPrimitive.TabsListProps>;

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

type TabsButtonProps = ButtonProps & Pick<TabsPrimitive.TabsTriggerProps, 'value'>;

const TabsButton = ({ value, classNames, children, onClick, ...props }: TabsButtonProps) => {
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
          orientation === 'horizontal' && contextValue === value ? (hasAttention ? 'primary' : 'default') : 'ghost'
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

type TabsIconButtonProps = IconButtonProps & Pick<TabsPrimitive.TabsTriggerProps, 'value'>;

const TabsIconButton = ({ value, classNames, onClick, ...props }: TabsIconButtonProps) => {
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
        variant={
          orientation === 'horizontal' && contextValue === value ? (hasAttention ? 'primary' : 'default') : 'ghost'
        }
        classNames={[
          orientation === 'vertical' && 'justify-start text-start w-full',
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
// Radix TabsPrimitive.Content already unmounts inactive panels (no forceMount) — inactive tab
// content is not in the DOM and effects do not run, which is the desired behaviour.
// React.Activity (experimental in React 19) is a reconciler-level symbol that deactivates its
// subtree when mode='hidden'. It was redundant here and prevented initial render of active panels.
//

type TabsPanelProps = ThemedClassName<TabsPrimitive.TabsContentProps>;

const TabsPanel = ({ classNames, children, ...props }: TabsPanelProps) => (
  <TabsPrimitive.Content {...props} className={mx('p-0! dx-focus-ring-inset-over-all', classNames)}>
    {children}
  </TabsPrimitive.Content>
);

TabsPanel.displayName = 'Tabs.Panel';

type TabsTabPrimitiveProps = TabsPrimitive.TabsTriggerProps;

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
