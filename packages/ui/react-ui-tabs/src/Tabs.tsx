//
// Copyright 2024 DXOS.org
//

import * as TabsPrimitive from '@radix-ui/react-tabs';
import React from 'react';

import { type ThemedClassName } from '@dxos/react-ui';
import { mx } from '@dxos/react-ui-theme';

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

type TabsTablistProps = TabsPrimitive.TabsListProps;

const TabsTablist = TabsPrimitive.List;

type TabsTabProps = TabsPrimitive.TabsTriggerProps;

const TabsTab = TabsPrimitive.Trigger;

type TabsTabpanelProps = TabsPrimitive.TabsContentProps;

const TabsTabpanel = TabsPrimitive.Content;

export const Tabs = {
  Root: TabsRoot,
  Tablist: TabsTablist,
  Tab: TabsTab,
  Panel: TabsTabpanel,
};

export type { TabsRootProps, TabsTablistProps, TabsTabProps, TabsTabpanelProps };
