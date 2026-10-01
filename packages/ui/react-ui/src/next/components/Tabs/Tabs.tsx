//
// Copyright 2026 DXOS.org
//

import { Tabs as TabsPrimitive, useTabsContext } from '@ark-ui/react/tabs';
import React, { type ComponentPropsWithoutRef, forwardRef } from 'react';

import { mx } from '@dxos/ui-theme';
import { type ThemedClassName } from '@dxos/ui-types';

import { recipes } from '../../recipes.ts';
import { type Size } from '../../sizes.ts';
import { Button } from '../Button/index.ts';

export type TabsOrientation = 'horizontal' | 'vertical';

/** How the selected trigger is filled: the input surface, or the accent (e.g. while the host has attention). */
export type TabsSelectedVariant = 'default' | 'primary';

//
// Root
//

type TabsRootProps = ThemedClassName<
  Omit<TabsPrimitive.RootProps, 'value' | 'defaultValue' | 'onValueChange' | 'lazyMount' | 'unmountOnExit'>
> & {
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  size?: Size;
  selectedVariant?: TabsSelectedVariant;
  /** Keep inactive panels mounted (hidden); by default they unmount, so their content re-runs its effects on show. */
  keepMounted?: boolean;
};

/**
 * Ark's tabs: a list of triggers over (horizontal) or beside (vertical) the selected content. A trigger activates on
 * click or Enter (`activationMode='manual'`); arrow keys move focus along the list.
 */
const TabsRoot = forwardRef<HTMLDivElement, TabsRootProps>(
  (
    {
      classNames,
      value,
      defaultValue,
      onValueChange,
      orientation = 'horizontal',
      activationMode = 'manual',
      size,
      selectedVariant = 'default',
      keepMounted = false,
      ...props
    },
    forwardedRef,
  ) => (
    <TabsPrimitive.Root
      {...props}
      {...(value !== undefined && { value })}
      defaultValue={defaultValue}
      onValueChange={onValueChange && (({ value }) => onValueChange(value))}
      orientation={orientation}
      activationMode={activationMode}
      lazyMount={!keepMounted}
      unmountOnExit={!keepMounted}
      data-size={size}
      data-selected-variant={selectedVariant}
      className={mx(recipes.tabs(), classNames)}
      ref={forwardedRef}
    />
  ),
);

TabsRoot.displayName = 'Next.Tabs.Root';

//
// List
//

type TabsListProps = ThemedClassName<TabsPrimitive.ListProps>;

/** The tablist: a row (or column) of triggers that scrolls along its axis when they overflow. */
const TabsList = forwardRef<HTMLDivElement, TabsListProps>(({ classNames, ...props }, forwardedRef) => (
  <TabsPrimitive.List {...props} className={mx(recipes.tabsList(), classNames)} ref={forwardedRef} />
));

TabsList.displayName = 'Next.Tabs.List';

//
// Trigger
//

type TabsTriggerProps = ComponentPropsWithoutRef<typeof Button> & Pick<TabsPrimitive.TriggerProps, 'value'>;

/** A ghost Button that fills when selected; takes Button's content props (`icon`, `label`, `iconOnly`). */
const TabsTrigger = forwardRef<HTMLButtonElement, TabsTriggerProps>(
  ({ value, disabled, classNames, variant = 'ghost', ...props }, forwardedRef) => (
    <TabsPrimitive.Trigger value={value} disabled={disabled} asChild>
      <Button {...props} variant={variant} classNames={[recipes.tabsTrigger(), classNames]} ref={forwardedRef} />
    </TabsPrimitive.Trigger>
  ),
);

TabsTrigger.displayName = 'Next.Tabs.Trigger';

//
// Content
//

type TabsContentProps = ThemedClassName<TabsPrimitive.ContentProps>;

const TabsContent = forwardRef<HTMLDivElement, TabsContentProps>(({ classNames, ...props }, forwardedRef) => (
  <TabsPrimitive.Content {...props} className={mx(recipes.tabsContent(), classNames)} ref={forwardedRef} />
));

TabsContent.displayName = 'Next.Tabs.Content';

//
// Indicator
//

type TabsIndicatorProps = ThemedClassName<TabsPrimitive.IndicatorProps>;

/** An underline that slides to the selected trigger (Ark measures it into `--left`/`--width`). */
const TabsIndicator = forwardRef<HTMLDivElement, TabsIndicatorProps>(({ classNames, ...props }, forwardedRef) => (
  <TabsPrimitive.Indicator {...props} className={mx(recipes.tabsIndicator(), classNames)} ref={forwardedRef} />
));

TabsIndicator.displayName = 'Next.Tabs.Indicator';

export const Tabs = {
  Root: TabsRoot,
  List: TabsList,
  Trigger: TabsTrigger,
  Content: TabsContent,
  Indicator: TabsIndicator,
  /** Ark's tabs api (`value`, `setValue`, `focusedValue`, …) for parts inside the Root. */
  useContext: useTabsContext,
};

export type { TabsContentProps, TabsIndicatorProps, TabsListProps, TabsRootProps, TabsTriggerProps };
