//
// Copyright 2024 DXOS.org
//

import { createContext } from '@radix-ui/react-context';
import * as TabsPrimitive from '@radix-ui/react-tabs';
import { useControllableState } from '@radix-ui/react-use-controllable-state';
import React, { type ComponentPropsWithoutRef, useCallback } from 'react';

import { Button, type ButtonProps, type ThemedClassName } from '@dxos/react-ui';
import { focusRing, ghostHover, ghostSelected, mx } from '@dxos/react-ui-theme';

type TabsActivePart = 'list' | 'panel';

const TABS_NAME = 'Tabs';

type TabsContextValue = {
  activePart: TabsActivePart;
  setActivePart: (nextActivePart: TabsActivePart) => void;
};

const [TabsContextProvider, useTabsContext] = createContext<TabsContextValue>(TABS_NAME, {
  activePart: 'list',
  setActivePart: () => {},
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
  ...props
}: TabsRootProps) => {
  const [activePart, setActivePart] = useControllableState({
    prop: propsActivePart,
    onChange: onActivePartChange,
    defaultProp: defaultActivePart,
  });
  return (
    <TabsContextProvider activePart={activePart} setActivePart={setActivePart}>
      <TabsPrimitive.Root
        {...props}
        data-active={activePart}
        className={mx(
          props.orientation === 'vertical' && '@md:grid @md:grid-cols-[minmax(min-content,1fr)_3fr] @md:gap-1',
          classNames,
        )}
      >
        {children}
      </TabsPrimitive.Root>
    </TabsContextProvider>
  );
};

type TabsTablistProps = ThemedClassName<TabsPrimitive.TabsListProps>;

const TabsTablist = ({ children, classNames, ...props }: TabsTablistProps) => {
  return (
    <TabsPrimitive.List
      {...props}
      className={mx('p-1 surface-input rounded place-self-start max-bs-[100%] is-full overflow-y-auto', classNames)}
    >
      {children}
    </TabsPrimitive.List>
  );
};

const TabsBackButton = ({ onClick, ...props }: ButtonProps) => {
  const { setActivePart } = useTabsContext();
  const handleClick = useCallback(
    (event) => {
      setActivePart('list');
      return onClick?.(event);
    },
    [onClick, setActivePart],
  );
  return <Button {...props} onClick={handleClick} />;
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
  const { setActivePart } = useTabsContext();
  const handleClick = useCallback(
    (event) => {
      setActivePart('panel');
      onClick?.(event);
    },
    [onClick, setActivePart],
  );
  return (
    <TabsPrimitive.Trigger value={value} onClick={handleClick} asChild>
      <Button
        density='fine'
        variant='ghost'
        {...props}
        classNames={['block is-full justify-start text-start pli-2 rounded-sm', ghostSelected, ghostHover, classNames]}
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
};

export type { TabsRootProps, TabsTablistProps, TabsTabProps, TabsTabGroupHeadingProps, TabsTabpanelProps };
