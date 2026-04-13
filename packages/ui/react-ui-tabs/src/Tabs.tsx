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
    // const tabsRoot = useRef<HTMLDivElement | null>(null);
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

type TabsViewportProps = ThemedClassName<ComponentPropsWithoutRef<'div'>>;

const TabsViewport = ({ classNames, children, ...props }: TabsViewportProps) => {
  const { activePart } = useTabsContext('TabsViewport');
  return (
    <div role='none' {...props} data-active={activePart} className={mx(classNames)}>
      {children}
    </div>
  );
};

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

type TabsTabGroupHeadingProps = ThemedClassName<ComponentPropsWithoutRef<'h2'>>;

const TabsTabGroupHeading = ({ children, classNames, ...props }: ThemedClassName<TabsTabGroupHeadingProps>) => {
  return (
    <h2 {...props} className={mx('my-1 px-2 text-sm text-un-accent', classNames)}>
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

type TabsPanelProps = ThemedClassName<TabsPrimitive.TabsContentProps>;

// TODO(burdon): Make slottable.
const TabsPanel = ({ classNames, children, ...props }: TabsPanelProps) => {
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
  Panel: TabsPanel,
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
  TabsPanelProps,
  TabsViewportProps,
};
