//
// Copyright 2024 DXOS.org
//

import { useArrowNavigationGroup, useFocusFinders, useFocusableGroup } from '@fluentui/react-tabster';
import { createContext } from '@radix-ui/react-context';
import * as TabsPrimitive from '@radix-ui/react-tabs';
import { useControllableState } from '@radix-ui/react-use-controllable-state';
import React, {
  type ComponentPropsWithoutRef,
  type MouseEvent,
  forwardRef,
  useCallback,
  useLayoutEffect,
} from 'react';

import {
  Button,
  type ButtonProps,
  IconButton,
  type IconButtonProps,
  type ThemedClassName,
  useForwardedRef,
} from '@dxos/react-ui';
import { useAttention } from '@dxos/react-ui-attention';
import { mx } from '@dxos/ui-theme';

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

type TabsRootProps = ThemedClassName<TabsPrimitive.TabsProps> &
  Partial<
    Pick<TabsContextValue, 'activePart' | 'attendableId'> & {
      onActivePartChange: (nextActivePart: TabsActivePart) => void;
      defaultActivePart: TabsActivePart;
    }
  >;

const TabsRoot = forwardRef<HTMLDivElement, TabsRootProps>(
  (
    {
      children,
      classNames,
      activePart: propsActivePart,
      onActivePartChange,
      defaultActivePart,
      value: propsValue,
      onValueChange,
      defaultValue,
      orientation = 'vertical',
      activationMode = 'manual',
      attendableId,
      ...props
    },
    forwardedRef,
  ) => {
    const tabsRoot = useForwardedRef(forwardedRef);

    // TODO(thure): Without these, we get Groupper/Mover `API used before initialization`, but why?
    const _1 = useArrowNavigationGroup();
    const _2 = useFocusableGroup();
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

    const { findFirstFocusable } = useFocusFinders();

    useLayoutEffect(() => {
      if (tabsRoot.current) {
        findFirstFocusable(tabsRoot.current)?.focus();
      }
    }, [activePart]);

    return (
      <TabsContextProvider
        orientation={orientation}
        activePart={activePart}
        setActivePart={setActivePart}
        value={value}
        attendableId={attendableId}
      >
        <TabsPrimitive.Root
          {...props}
          className={mx('overflow-hidden', classNames)}
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

type TabsViewportProps = ThemedClassName<ComponentPropsWithoutRef<'div'>>;

const TabsViewport = ({ classNames, children, ...props }: TabsViewportProps) => {
  const { activePart } = useTabsContext('TabsViewport');
  return (
    <div {...props} data-active={activePart} className={mx(classNames)}>
      {children}
    </div>
  );
};

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

type TabsTabProps = ButtonProps & Pick<TabsPrimitive.TabsTriggerProps, 'value'>;

const TabsTab = ({ value, classNames, children, onClick, ...props }: TabsTabProps) => {
  const { setActivePart, orientation, value: contextValue, attendableId } = useTabsContext('TabsTab');
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

TabsTab.displayName = 'Tabs.Tab';

//
// IconTab
//

type TabsIconTabProps = IconButtonProps & Pick<TabsPrimitive.TabsTriggerProps, 'value'>;

const TabsIconTab = ({ value, classNames, onClick, ...props }: TabsIconTabProps) => {
  const { setActivePart, orientation, value: contextValue, attendableId } = useTabsContext('TabsTab');
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

TabsIconTab.displayName = 'Tabs.IconTab';

//
// Panel
//
// NOTE(@dmaretskyi): Do NOT wrap TabsPanel children in React.Activity (mode='hidden'/'visible').
// React.Activity is a reconciler-level symbol (experimental in React 19) that deactivates its
// subtree when mode='hidden' — effects do not run and rendering is deferred indefinitely.
// This caused surfaces rendered inside inactive tab panels to never mount.
// Radix TabsPrimitive.Content already handles visibility via CSS (display:none / hidden attr).
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
  Tab: TabsTab,
  IconTab: TabsIconTab,
  TabPrimitive: TabsPrimitive.Trigger,
  TabGroupHeading: TabsTabGroupHeading,
  Viewport: TabsViewport,
  Panel: TabsPanel,
  BackButton: TabsBackButton,
};

export type {
  TabsActivePart,
  TabsRootProps,
  TabsTablistProps,
  TabsTabProps,
  TabsTabPrimitiveProps,
  TabsTabGroupHeadingProps,
  TabsViewportProps,
  TabsPanelProps,
};
