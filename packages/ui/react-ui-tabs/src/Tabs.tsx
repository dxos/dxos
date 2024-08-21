//
// Copyright 2024 DXOS.org
//

// import '@types/react';
import * as TabsPrimitive from '@radix-ui/react-tabs';

type TabsRootProps = TabsPrimitive.TabsProps;

const TabsRoot = TabsPrimitive.Root;

type TabsTablistProps = TabsPrimitive.TabsListProps;

const TabsTablist = TabsPrimitive.List;

type TabsTabProps = TabsPrimitive.TabsTriggerProps;

const TabsTab = TabsPrimitive.Trigger;

type TabsPanelProps = TabsPrimitive.TabsContentProps;

const TabsPanel = TabsPrimitive.Content;

export const Tabs = {
  Root: TabsRoot,
  Tablist: TabsTablist,
  Tab: TabsTab,
  Panel: TabsPanel,
};

export type { TabsRootProps, TabsTablistProps, TabsTabProps, TabsPanelProps };
