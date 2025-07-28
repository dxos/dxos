//
// Copyright 2023 DXOS.org
//

import { Slot } from '@radix-ui/react-slot';
import React, { type ComponentPropsWithoutRef, type FC, forwardRef, type ForwardRefExoticComponent } from 'react';

import {
  List as ListPrimitive,
  type ListProps as ListPrimitiveProps,
  type ListScopedProps,
  ListItemHeading as ListPrimitiveItemHeading,
  type ListItemHeadingProps as ListPrimitiveItemHeadingProps,
  ListItemOpenTrigger as ListPrimitiveItemOpenTrigger,
  type ListItemOpenTriggerProps as ListPrimitiveItemOpenTriggerProps,
  ListItemCollapsibleContent,
  type ListItemCollapsibleContentProps,
  ListItem as ListPrimitiveItem,
  type ListItemProps as ListPrimitiveItemProps,
  type ListItemScopedProps,
  LIST_NAME,
  LIST_ITEM_NAME,
  useListContext,
  useListItemContext,
} from '@dxos/react-list';
import { type Density } from '@dxos/react-ui-types';

import { ListDropIndicator } from './ListDropIndicator';
import { useDensityContext, useThemeContext } from '../../hooks';
import { type ThemedClassName } from '../../util';
import { DensityProvider } from '../DensityProvider';
import { Icon } from '../Icon';

type ListProps = ThemedClassName<ListPrimitiveProps> & { density?: Density };

const List = forwardRef<HTMLOListElement, ListProps>(({ classNames, children, ...props }, forwardedRef) => {
  const { tx } = useThemeContext();
  const density = useDensityContext(props.density);

  return (
    <DensityProvider density={density}>
      <ListPrimitive {...props} className={tx('list.root', 'list', {}, classNames)} ref={forwardedRef}>
        {children}
      </ListPrimitive>
    </DensityProvider>
  );
});

type ListItemEndcapProps = ThemedClassName<ComponentPropsWithoutRef<'div'>> & { asChild?: boolean };

const ListItemEndcap = forwardRef<HTMLDivElement, ListItemEndcapProps>(
  ({ children, classNames, asChild, ...props }, forwardedRef) => {
    const Root = asChild ? Slot : 'div';
    const density = useDensityContext();
    const { tx } = useThemeContext();
    return (
      <Root
        {...(!asChild && { role: 'none' })}
        {...props}
        className={tx('list.item.endcap', 'list__listItem__endcap', { density }, classNames)}
        ref={forwardedRef}
      >
        {children}
      </Root>
    );
  },
);

const MockListItemOpenTrigger = ({
  classNames,
  ...props
}: ThemedClassName<Omit<ComponentPropsWithoutRef<'div'>, 'children'>>) => {
  const density = useDensityContext();
  const { tx } = useThemeContext();
  return (
    <div
      role='none'
      {...props}
      className={tx('list.item.openTrigger', 'list__listItem__openTrigger--mock', { density }, classNames)}
    />
  );
};

type ListItemHeadingProps = ThemedClassName<ListPrimitiveItemHeadingProps>;

const ListItemHeading = forwardRef<HTMLParagraphElement, ListItemHeadingProps>(
  ({ children, classNames, ...props }, forwardedRef) => {
    const { tx } = useThemeContext();
    const density = useDensityContext();
    return (
      <ListPrimitiveItemHeading
        {...props}
        className={tx('list.item.heading', 'list__listItem__heading', { density }, classNames)}
        ref={forwardedRef}
      >
        {children}
      </ListPrimitiveItemHeading>
    );
  },
);

type ListItemOpenTriggerProps = ThemedClassName<ListPrimitiveItemOpenTriggerProps>;

const ListItemOpenTrigger = forwardRef<HTMLButtonElement, ListItemOpenTriggerProps>(
  ({ __listItemScope, classNames, children, ...props }, forwardedRef) => {
    const { tx } = useThemeContext();
    const density = useDensityContext();
    const { open } = useListItemContext(LIST_ITEM_NAME, __listItemScope);
    const iconName = open ? 'ph--caret-down--bold' : 'ph--caret-right--bold';
    return (
      <ListPrimitiveItemOpenTrigger
        {...props}
        className={tx('list.item.openTrigger', 'list__listItem__openTrigger', { density }, classNames)}
        ref={forwardedRef}
      >
        {children || (
          <Icon icon={iconName} className={tx('list.item.openTriggerIcon', 'list__listItem__openTrigger__icon', {})} />
        )}
      </ListPrimitiveItemOpenTrigger>
    );
  },
);

type ListItemRootProps = ThemedClassName<ListPrimitiveItemProps>;

const ListItemRoot = forwardRef<HTMLLIElement, ListItemRootProps>(
  ({ classNames, children, ...props }, forwardedRef) => {
    const { tx } = useThemeContext();
    const density = useDensityContext();
    return (
      <ListPrimitiveItem
        {...props}
        className={tx('list.item.root', 'list__listItem', { density, collapsible: props.collapsible }, classNames)}
        ref={forwardedRef}
      >
        {children}
      </ListPrimitiveItem>
    );
  },
);

export const ListItem: {
  Root: ForwardRefExoticComponent<ListItemRootProps>;
  Endcap: ForwardRefExoticComponent<ListItemEndcapProps>;
  Heading: ForwardRefExoticComponent<ListItemHeadingProps>;
  OpenTrigger: ForwardRefExoticComponent<ListItemOpenTriggerProps>;
  CollapsibleContent: ForwardRefExoticComponent<ListItemCollapsibleContentProps>;
  MockOpenTrigger: FC<ThemedClassName<Omit<ComponentPropsWithoutRef<'div'>, 'children'>>>;
  DropIndicator: typeof ListDropIndicator;
} = {
  Root: ListItemRoot,
  Endcap: ListItemEndcap,
  Heading: ListItemHeading,
  OpenTrigger: ListItemOpenTrigger,
  CollapsibleContent: ListItemCollapsibleContent,
  MockOpenTrigger: MockListItemOpenTrigger,
  DropIndicator: ListDropIndicator,
};

export { List, useListContext, useListItemContext, LIST_NAME, LIST_ITEM_NAME };

export type {
  ListProps,
  ListScopedProps,
  ListItemRootProps,
  ListItemScopedProps,
  ListItemEndcapProps,
  ListItemHeadingProps,
  ListItemOpenTriggerProps,
  ListItemCollapsibleContentProps,
};
