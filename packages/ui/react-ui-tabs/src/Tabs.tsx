//
// Copyright 2024 DXOS.org
//

import { useFocusFinders } from '@fluentui/react-tabster';
import { createContext } from '@radix-ui/react-context';
import * as TabsPrimitive from '@radix-ui/react-tabs';
import { useControllableState } from '@radix-ui/react-use-controllable-state';
import React, { type ComponentPropsWithoutRef, type MouseEvent, useCallback, useLayoutEffect, useRef } from 'react';

import { Button, type ButtonProps, type ThemedClassName } from '@dxos/react-ui';
import { focusRing, ghostHover, ghostSelectedContainerMd, mx } from '@dxos/react-ui-theme';

type TabsActivePart = 'list' | 'panel';

const TABS_NAME = 'Tabs';

type TabsContextValue = {
  activePart: TabsActivePart;
  setActivePart: (nextActivePart: TabsActivePart) => void;
} & Pick<TabsPrimitive.TabsProps, 'orientation'>;

const [TabsContextProvider, useTabsContext] = createContext<TabsContextValue>(TABS_NAME, {
  activePart: 'list',
  setActivePart: () => {},
  orientation: 'vertical',
});

type TabsRootProps = ThemedClassName<TabsPrimitive.TabsProps> &
  Partial<{
    activePart: TabsActivePart;
    onActivePartChange: (nextActivePart: TabsActivePart) => void;
    defaultActivePart: TabsActivePart;
  }>;

const TabsRoot = ({
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
  ...props
}: TabsRootProps) => {
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

  const handleValueChange = useCallback((nextValue: string) => {
    setActivePart('panel');
    setValue(nextValue);
  }, []);

  const { findFirstFocusable } = useFocusFinders();

  const tabsRoot = useRef<HTMLDivElement | null>(null);

  useLayoutEffect(() => {
    tabsRoot.current && findFirstFocusable(tabsRoot.current)?.focus();
  }, [activePart]);

  return (
    <TabsContextProvider orientation={orientation} activePart={activePart} setActivePart={setActivePart}>
      <TabsPrimitive.Root
        activationMode={activationMode}
        data-active={activePart}
        orientation={orientation}
        {...props}
        value={value}
        onValueChange={handleValueChange}
        className={mx(
          'overflow-hidden',
          orientation === 'vertical' && '[&[data-active=list]_[role=tabpanel]]:invisible',
          classNames,
        )}
        ref={tabsRoot}
      >
        {children}
      </TabsPrimitive.Root>
    </TabsContextProvider>
  );
};

type TabsViewportProps = ThemedClassName<ComponentPropsWithoutRef<'div'>>;

const TabsViewport = ({ classNames, children, ...props }: TabsViewportProps) => {
  const { orientation, activePart } = useTabsContext('TabsViewport');
  return (
    <div
      role='none'
      {...props}
      data-active={activePart}
      className={mx(
        orientation === 'vertical' &&
          'grid is-[200%] grid-cols-2 data-[active=panel]:mis-[-100%] @md:is-auto @md:data-[active=panel]:mis-0 @md:grid-cols-[minmax(min-content,1fr)_3fr] @md:gap-1',
        classNames,
      )}
    >
      {children}
    </div>
  );
};

type TabsTablistProps = ThemedClassName<TabsPrimitive.TabsListProps>;

const TabsTablist = ({ children, classNames, ...props }: TabsTablistProps) => {
  return (
    <TabsPrimitive.List
      {...props}
      className={mx('@md:surface-input rounded place-self-start max-bs-full is-full overflow-y-auto', classNames)}
    >
      {children}
    </TabsPrimitive.List>
  );
};

const TabsBackButton = ({ onClick, classNames, ...props }: ButtonProps) => {
  const { setActivePart } = useTabsContext('TabsBackButton');
  const handleClick = useCallback(
    (event: MouseEvent<HTMLButtonElement>) => {
      setActivePart('list');
      return onClick?.(event);
    },
    [onClick, setActivePart],
  );
  return <Button {...props} classNames={['is-full text-start @md:hidden mbe-2', classNames]} onClick={handleClick} />;
};

type TabsTabGroupHeadingProps = ThemedClassName<ComponentPropsWithoutRef<'h2'>>;

const TabsTabGroupHeading = ({ children, classNames, ...props }: ThemedClassName<TabsTabGroupHeadingProps>) => {
  return (
    <h2 {...props} className={mx('mlb-1 pli-2 text-sm fg-unAccent', classNames)}>
      {children}
    </h2>
  );
};

type TabsTabProps = ButtonProps & Pick<TabsPrimitive.TabsTriggerProps, 'value'>;

const TabsTab = ({ value, classNames, children, onClick, ...props }: TabsTabProps) => {
  const { setActivePart } = useTabsContext('TabsTab');
  // NOTE: this handler is only called if the tab is *already active*.
  const handleClick = useCallback(
    (event: MouseEvent<HTMLButtonElement>) => {
      setActivePart('panel');
      onClick?.(event);
    },
    [setActivePart, onClick],
  );
  return (
    <TabsPrimitive.Trigger value={value} asChild>
      <Button
        density='fine'
        variant='ghost'
        {...props}
        onClick={handleClick}
        classNames={[
          'block is-full justify-start text-start pli-2 rounded-sm',
          ghostSelectedContainerMd,
          ghostHover,
          classNames,
        ]}
      >
        {children}
      </Button>
    </TabsPrimitive.Trigger>
  );
};

type TabsTabpanelProps = ThemedClassName<TabsPrimitive.TabsContentProps>;

const TabsTabpanel = ({ classNames, children, ...props }: TabsTabpanelProps) => {
  return (
    <TabsPrimitive.Content {...props} className={mx('rounded-sm', focusRing, classNames)}>
      {children}
    </TabsPrimitive.Content>
  );
};

export const Tabs = {
  Root: TabsRoot,
  Tablist: TabsTablist,
  Tab: TabsTab,
  TabGroupHeading: TabsTabGroupHeading,
  Tabpanel: TabsTabpanel,
  BackButton: TabsBackButton,
  Viewport: TabsViewport,
};

export type {
  TabsActivePart,
  TabsRootProps,
  TabsTablistProps,
  TabsTabProps,
  TabsTabGroupHeadingProps,
  TabsTabpanelProps,
  TabsViewportProps,
};
