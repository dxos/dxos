//
// Copyright 2022 DXOS.org
//

import * as NavigationMenuPrimitive from '@radix-ui/react-navigation-menu';
import React, { ComponentProps, ForwardedRef, forwardRef, ReactNode } from 'react';

import { defaultFocus, defaultHover, defaultInlineSeparator } from '../../styles';
import { mx } from '../../util';
import { defaultAppButtonColors, primaryAppButtonColors } from '../Button';
import { Tooltip, TooltipProps } from '../Tooltip';

interface NavMenuItemSharedProps {
  children: ReactNode;
  active?: boolean;
  separator?: false;
}

export interface NavMenuLinkItemProps extends NavMenuItemSharedProps {
  triggerLinkProps: Omit<ComponentProps<typeof NavigationMenuPrimitive.Link>, 'children'>;
  children: ReactNode;
}

export interface NavMenuTooltipLinkItemProps extends NavMenuLinkItemProps {
  tooltip: Omit<TooltipProps, 'children'>;
}

export interface NavMenuInvokerItemProps extends NavMenuItemSharedProps {
  content: ReactNode;
  children: ReactNode;
}

export interface NavMenuSeparatorProps {
  separator: true;
}

export type NavMenuItem =
  | NavMenuTooltipLinkItemProps
  | NavMenuLinkItemProps
  | NavMenuInvokerItemProps
  | NavMenuSeparatorProps;

export interface NavMenuSlots {
  root?: Omit<ComponentProps<typeof NavigationMenuPrimitive.Root>, 'children'>;
  viewport?: Omit<ComponentProps<typeof NavigationMenuPrimitive.Viewport>, 'children'>;
  list?: Omit<ComponentProps<typeof NavigationMenuPrimitive.List>, 'children'>;
  indicator?: Omit<ComponentProps<typeof NavigationMenuPrimitive.Indicator>, 'children'>;
  indicatorIcon?: Pick<ComponentProps<'div'>, 'className'>;
}

export interface NavMenuProps {
  items: NavMenuItem[];
  slots?: NavMenuSlots;
  variant?: 'horizontal' | 'vertical';
}

const NavMenuInvokerItem = forwardRef(
  ({ content, children, active }: NavMenuInvokerItemProps, ref: ForwardedRef<HTMLLIElement>) => {
    return (
      <NavigationMenuPrimitive.Item ref={ref}>
        <NavigationMenuPrimitive.Trigger
          className={mx(
            'px-3 py-2 text-sm rounded-md text-sm font-medium transition-color',
            active ? primaryAppButtonColors : defaultAppButtonColors,
            defaultFocus,
            defaultHover({})
          )}
        >
          {children}
        </NavigationMenuPrimitive.Trigger>
        <NavigationMenuPrimitive.Content
          className={mx(
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
  }
);

const NavMenuLinkItem = forwardRef(
  ({ triggerLinkProps, children, active }: NavMenuLinkItemProps, ref: ForwardedRef<HTMLLIElement>) => (
    <NavigationMenuPrimitive.Item asChild ref={ref}>
      <NavigationMenuPrimitive.Link
        {...triggerLinkProps}
        active={active}
        className={mx(
          'px-3 py-2 text-sm rounded-md transition-color',
          active ? primaryAppButtonColors : defaultAppButtonColors,
          active ? 'font-medium' : 'font-normal',
          defaultFocus,
          defaultHover({}),
          triggerLinkProps.className
        )}
      >
        {children}
      </NavigationMenuPrimitive.Link>
    </NavigationMenuPrimitive.Item>
  )
);

const NavMenuTooltipLinkItem = forwardRef(
  ({ tooltip, triggerLinkProps, active, children }: NavMenuTooltipLinkItemProps, ref: ForwardedRef<HTMLLIElement>) => (
    <Tooltip {...tooltip}>
      {/* todo: why does the Tooltip not show if you use <NavMenuLinkItem {…}/> here? */}
      <NavigationMenuPrimitive.Item asChild ref={ref}>
        <NavigationMenuPrimitive.Link
          {...triggerLinkProps}
          active={active}
          className={mx(
            'px-3 py-2 text-sm rounded-md transition-color',
            active ? primaryAppButtonColors : defaultAppButtonColors,
            active ? 'font-medium' : 'font-normal',
            defaultFocus,
            defaultHover({}),
            triggerLinkProps.className
          )}
        >
          {children}
        </NavigationMenuPrimitive.Link>
      </NavigationMenuPrimitive.Item>
    </Tooltip>
  )
);

export const NavMenuLink = NavigationMenuPrimitive.Link;

export const NavMenuSeparatorItem = (_props: NavMenuSeparatorProps) => {
  return <span role='none' className={mx(defaultInlineSeparator, 'bs-5')} />;
};

const isTooltipLinkItem = (o: any): o is NavMenuTooltipLinkItemProps => 'tooltip' in o;
const isLinkItem = (o: any): o is NavMenuLinkItemProps => 'triggerLinkProps' in o;
const isSeparator = (o: any): o is NavMenuSeparatorProps => 'separator' in o;

export const NavMenu = ({ items, slots = {}, variant = 'horizontal' }: NavMenuProps) => {
  return (
    <NavigationMenuPrimitive.Root
      {...slots.root}
      orientation={variant}
      className={mx(
        'rounded-lg bg-white dark:bg-neutral-750',
        variant === 'vertical' ? 'max-bs-full overflow-y-auto' : 'max-is-full overflow-x-auto',
        slots.root?.className
      )}
    >
      <NavigationMenuPrimitive.List
        {...slots.list}
        className={mx(
          'relative flex gap-1 p-1 button-elevation',
          variant === 'vertical' ? 'flex-col items-stretch' : 'flex-row items-center',
          slots.list?.className
        )}
      >
        {items.map((item: NavMenuItem, i) => {
          return isTooltipLinkItem(item) ? (
            <NavMenuTooltipLinkItem key={i} {...item} />
          ) : isLinkItem(item) ? (
            <NavMenuLinkItem key={i} {...item} />
          ) : isSeparator(item) ? (
            <NavMenuSeparatorItem key={i} {...item} />
          ) : (
            <NavMenuInvokerItem key={i} {...item} />
          );
        })}

        <NavigationMenuPrimitive.Indicator
          {...slots.indicator}
          className={mx(
            'z-10 top-[100%] flex items-end justify-center h-2 overflow-hidden',
            'radix-state-visible:animate-fade-in',
            'radix-state-hidden:animate-fade-out',
            'transition-[width_transform] duration-[250ms] ease-[ease]',
            slots.indicator?.className
          )}
        >
          <div
            className={mx(
              'top-1 relative bg-white dark:bg-neutral-750 w-2 h-2 rotate-45',
              slots.indicatorIcon?.className
            )}
          />
        </NavigationMenuPrimitive.Indicator>
      </NavigationMenuPrimitive.List>

      <div
        className={mx('absolute flex justify-center', 'w-[140%] left-[-20%] top-[100%]')}
        style={{
          perspective: '2000px'
        }}
      >
        <NavigationMenuPrimitive.Viewport
          {...slots.viewport}
          className={mx(
            'relative mbs-2 shadow-lg rounded-md bg-white dark:bg-neutral-750 overflow-hidden',
            'w-radix-navigation-menu-viewport',
            'h-radix-navigation-menu-viewport',
            'radix-state-open:animate-scale-in-content',
            'radix-state-closed:animate-scale-out-content',
            'origin-[top_center] transition-[width_height] duration-300 ease-[ease]',
            slots.viewport?.className
          )}
        />
      </div>
    </NavigationMenuPrimitive.Root>
  );
};
