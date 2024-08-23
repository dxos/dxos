//
// Copyright 2024 DXOS.org
//

import * as TabsPrimitive from '@radix-ui/react-tabs';
import React, { type ComponentPropsWithoutRef } from 'react';

import { Button, type ButtonProps, type ThemedClassName } from '@dxos/react-ui';
import { ghostHover, ghostSelected, mx } from '@dxos/react-ui-theme';

type TabsRootProps = ThemedClassName<TabsPrimitive.TabsProps>;

const TabsRoot = ({ children, classNames, ...props }: TabsRootProps) => {
  return (
    <TabsPrimitive.Root
      {...props}
      className={mx('grow mlb-4 overflow-hidden grid grid-cols-[minmax(min-content,1fr)_3fr] gap-1', classNames)}
    >
      {children}
    </TabsPrimitive.Root>
  );
};

type TabsTablistProps = ThemedClassName<TabsPrimitive.TabsListProps>;

const TabsTablist = ({ children, classNames, ...props }: TabsTablistProps) => {
  return (
    <TabsPrimitive.List
      aria-orientation='vertical'
      {...props}
      className={mx('p-1 surface-input rounded place-self-start max-bs-[100%] is-full overflow-y-auto', classNames)}
    >
      {children}
    </TabsPrimitive.List>
  );
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

const TabsTab = ({ value, classNames, children, ...props }: TabsTabProps) => {
  return (
    <TabsPrimitive.Trigger value={value} asChild>
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
    <TabsPrimitive.Content {...props} className={mx(classNames)}>
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
};

export type { TabsRootProps, TabsTablistProps, TabsTabProps, TabsTabGroupHeadingProps, TabsTabpanelProps };
