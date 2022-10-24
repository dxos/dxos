//
// Copyright 2022 DXOS.org
//

import * as NavigationMenuPrimitive from '@radix-ui/react-navigation-menu';
import cx from 'classnames';
import React, { ComponentProps, ReactNode } from 'react';

import { defaultFocus, defaultHover } from '../../styles';
import { defaultButtonColors, primaryButtonColors } from '../Button';

interface NavMenuItemSharedProps {
  children: ReactNode
  active?: boolean
  separator?: false
}

export interface NavMenuLinkItemProps extends NavMenuItemSharedProps {
  triggerLinkProps: Omit<ComponentProps<typeof NavigationMenuPrimitive.Link>,
    'children'>
  children: ReactNode
}

export interface NavMenuInvokerItemProps extends NavMenuItemSharedProps {
  content: ReactNode
  children: ReactNode
}

export interface NavMenuSeparatorProps {
  separator: true
}

export type NavMenuItem = NavMenuLinkItemProps | NavMenuInvokerItemProps | NavMenuSeparatorProps;

export interface NavMenuProps extends ComponentProps<typeof NavigationMenuPrimitive.Root> {
  items: NavMenuItem[]
}

const NavMenuInvokerItem = ({
  content,
  children,
  active
}: NavMenuInvokerItemProps) => {
  return (
    <NavigationMenuPrimitive.Item>
      <NavigationMenuPrimitive.Trigger
        className={cx(
          'px-3 py-2 text-sm rounded-md text-sm font-medium transition-color',
          active ? primaryButtonColors : defaultButtonColors,
          defaultFocus,
          defaultHover({})
        )}
      >
        {children}
      </NavigationMenuPrimitive.Trigger>
      <NavigationMenuPrimitive.Content
        className={cx(
          'absolute w-auto top-0 left-0 rounded-lg',
          'radix-motion-from-start:animate-enter-from-left',
          'radix-motion-from-end:animate-enter-from-right',
          'radix-motion-to-start:animate-exit-to-left',
          'radix-motion-to-end:animate-exit-to-right'
        )}
      >
        {content}
      </NavigationMenuPrimitive.Content>
    </NavigationMenuPrimitive.Item>
  );
};

const NavMenuLinkItem = ({
  triggerLinkProps,
  children,
  active
}: NavMenuLinkItemProps) => (
  <NavigationMenuPrimitive.Item asChild>
    <NavigationMenuPrimitive.Link
      {...triggerLinkProps}
      className={cx(
        'px-3 py-2 text-sm rounded-md text-sm font-medium transition-color',
        active ? primaryButtonColors : defaultButtonColors,
        defaultFocus,
        defaultHover({}),
        triggerLinkProps.className
      )}
    >
      {children}
    </NavigationMenuPrimitive.Link>
  </NavigationMenuPrimitive.Item>
);

export const NavMenuLink = NavigationMenuPrimitive.Link;

export const NavMenuSeparatorItem = (_props: NavMenuSeparatorProps) => {
  return <span role='none' className='h-5 border-l border-neutral-300 dark:border-neutral-700' />;
};

const isLinkItem = (o: any): o is NavMenuLinkItemProps => 'triggerLinkProps' in o;
const isSeparator = (o: any): o is NavMenuSeparatorProps => 'separator' in o;

export const NavMenu = ({ items, ...rootProps }: NavMenuProps) => {
  return (
    <NavigationMenuPrimitive.Root {...rootProps} className={cx('flex justify-center', rootProps.className)}>
      <NavigationMenuPrimitive.List
        className='relative flex flex-row items-center rounded-lg bg-white dark:bg-neutral-800 p-2 space-x-2 button-elevation'>
        {items.map((item: NavMenuItem, i) => (
          isLinkItem(item)
            ? <NavMenuLinkItem {...item} />
            : isSeparator(item)
              ? <NavMenuSeparatorItem {...item} />
              : <NavMenuInvokerItem {...item} />
        ))}

        <NavigationMenuPrimitive.Indicator
          className={cx(
            'z-10',
            'top-[100%] flex items-end justify-center h-2 overflow-hidden',
            'radix-state-visible:animate-fade-in',
            'radix-state-hidden:animate-fade-out',
            'transition-[width_transform] duration-[250ms] ease-[ease]'
          )}
        >
          <div
            className='top-1 relative bg-white dark:bg-neutral-800 w-2 h-2 rotate-45' />
        </NavigationMenuPrimitive.Indicator>
      </NavigationMenuPrimitive.List>

      <div
        className={cx(
          'absolute flex justify-center',
          'w-[140%] left-[-20%] top-[100%]'
        )}
        style={{
          perspective: '2000px'
        }}
      >
        <NavigationMenuPrimitive.Viewport
          className={cx(
            'relative mt-2 shadow-lg rounded-md bg-white dark:bg-neutral-800 overflow-hidden',
            'w-radix-navigation-menu-viewport',
            'h-radix-navigation-menu-viewport',
            'radix-state-open:animate-scale-in-content',
            'radix-state-closed:animate-scale-out-content',
            'origin-[top_center] transition-[width_height] duration-300 ease-[ease]'
          )}
        />
      </div>
    </NavigationMenuPrimitive.Root>
  );
};
