//
// Copyright 2024 DXOS.org
//

import { useArrowNavigationGroup, useFocusFinders, useFocusableGroup } from '@fluentui/react-tabster';
import { createContext } from '@radix-ui/react-context';
import * as TabsPrimitive from '@radix-ui/react-tabs';
import { useControllableState } from '@radix-ui/react-use-controllable-state';
import React, {
  Activity,
  type ComponentPropsWithoutRef,
  type MouseEvent,
  useCallback,
  useLayoutEffect,
  useRef,
} from 'react';

import { Button, type ButtonProps, IconButton, type IconButtonProps, type ThemedClassName } from '@dxos/react-ui';
import { useAttention } from '@dxos/react-ui-attention';
import { ghostSelectedContainerMd, mx } from '@dxos/react-ui-theme';

type TabsActivePart = 'list' | 'panel';

const TABS_NAME = 'Tabs';

type TabsContextValue = {
  activePart: TabsActivePart;
  setActivePart: (nextActivePart: TabsActivePart) => void;
  attendableId?: string;
  verticalVariant?: 'stateful' | 'stateless';
} & Pick<TabsPrimitive.TabsProps, 'orientation' | 'value'>;

const [TabsContextProvider, useTabsContext] = createContext<TabsContextValue>(TABS_NAME, {
  activePart: 'list',
  setActivePart: () => {},
  orientation: 'vertical',
});

type TabsRootProps = ThemedClassName<TabsPrimitive.TabsProps> &
  Partial<Pick<TabsContextValue, 'activePart' | 'verticalVariant' | 'attendableId'>> &
  Partial<{
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
  verticalVariant = 'stateful',
  attendableId,
  ...props
}: TabsRootProps) => {
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
  const tabsRoot = useRef<HTMLDivElement | null>(null);

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
      verticalVariant={verticalVariant}
    >
      <TabsPrimitive.Root
        activationMode={activationMode}
        data-active={activePart}
        orientation={orientation}
        {...props}
        value={value}
        onValueChange={handleValueChange}
        className={mx(
          'overflow-hidden',
          orientation === 'vertical' &&
            verticalVariant === 'stateful' &&
            '[&[data-active=list]_[role=tabpanel]]:invisible @md:[&[data-active=list]_[role=tabpanel]]:visible',
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
  const { orientation, activePart, verticalVariant } = useTabsContext('TabsViewport');
  return (
    <div
      role='none'
      {...props}
      data-active={activePart}
      className={mx(
        orientation === 'vertical' &&
          verticalVariant === 'stateful' && [
            'grid is-[200%] grid-cols-2 data-[active=panel]:mis-[-100%]',
            '@md:is-auto @md:data-[active=panel]:mis-0 @md:grid-cols-[minmax(min-content,1fr)_3fr] @md:gap-1',
          ],
        classNames,
      )}
    >
      {children}
    </div>
  );
};

type TabsTablistProps = ThemedClassName<TabsPrimitive.TabsListProps>;

const TabsTablist = ({ children, classNames, ...props }: TabsTablistProps) => {
  const { orientation, verticalVariant } = useTabsContext('TabsTablist');
  return (
    <TabsPrimitive.List
      {...props}
      data-arrow-keys={orientation === 'vertical' ? 'up down' : 'left right'}
      className={mx(
        'max-bs-full is-full',
        // NOTE: Padding should be common to Toolbar.
        orientation === 'vertical' ? 'overflow-y-auto' : 'flex items-stretch justify-start overflow-x-auto p-1 gap-1',
        orientation === 'vertical' && verticalVariant === 'stateful' && 'place-self-start p-1',
        classNames,
      )}
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
    <h2 {...props} className={mx('mlb-1 pli-2 text-sm text-unAccent', classNames)}>
      {children}
    </h2>
  );
};

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
        density='fine'
        variant={
          orientation === 'horizontal' && contextValue === value ? (hasAttention ? 'primary' : 'default') : 'ghost'
        }
        {...props}
        onClick={handleClick}
        classNames={[
          orientation === 'vertical' && 'block justify-start text-start is-full',
          orientation === 'vertical' && ghostSelectedContainerMd,
          classNames,
        ]}
      >
        {children}
      </Button>
    </TabsPrimitive.Trigger>
  );
};

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
        density='fine'
        variant={
          orientation === 'horizontal' && contextValue === value ? (hasAttention ? 'primary' : 'default') : 'ghost'
        }
        {...props}
        onClick={handleClick}
        classNames={[
          orientation === 'vertical' && 'justify-start text-start is-full',
          orientation === 'vertical' && ghostSelectedContainerMd,
          classNames,
        ]}
      />
    </TabsPrimitive.Trigger>
  );
};

type TabsTabpanelProps = ThemedClassName<TabsPrimitive.TabsContentProps>;

const TabsTabpanel = ({ classNames, children, ...props }: TabsTabpanelProps) => {
  const { value: contextValue } = useTabsContext('TabsTab');
  return (
    <Activity mode={contextValue === props.value ? 'visible' : 'hidden'}>
      <TabsPrimitive.Content {...props} className={mx('dx-focus-ring-inset-over-all', classNames)}>
        {children}
      </TabsPrimitive.Content>
    </Activity>
  );
};

type TabsTabPrimitiveProps = TabsPrimitive.TabsTriggerProps;

export const Tabs = {
  Root: TabsRoot,
  Tablist: TabsTablist,
  Tab: TabsTab,
  IconTab: TabsIconTab,
  TabPrimitive: TabsPrimitive.Trigger,
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
  TabsTabPrimitiveProps,
  TabsTabGroupHeadingProps,
  TabsTabpanelProps,
  TabsViewportProps,
};
