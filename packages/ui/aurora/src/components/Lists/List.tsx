//
// Copyright 2023 DXOS.org
//

import { CaretDown, CaretRight } from '@phosphor-icons/react';
import { Slot } from '@radix-ui/react-slot';
import React, { ComponentPropsWithoutRef, FC, forwardRef, ForwardRefExoticComponent } from 'react';

import { Density } from '@dxos/aurora-types';
import {
  List as ListPrimitive,
  ListProps as ListPrimitiveProps,
  ListScopedProps,
  ListItemHeading as ListPrimitiveItemHeading,
  ListItemHeadingProps as ListPrimitiveItemHeadingProps,
  ListItemOpenTrigger as ListPrimitiveItemOpenTrigger,
  ListItemOpenTriggerProps as ListPrimitiveItemOpenTriggerProps,
  ListItemCollapsibleContent,
  ListItemCollapsibleContentProps,
  ListItem as ListPrimitiveItem,
  ListItemProps as ListPrimitiveItemProps,
  ListItemScopedProps,
  LIST_NAME,
  LIST_ITEM_NAME,
  useListContext,
  useListItemContext,
} from '@dxos/react-list';

import { useDensityContext, useThemeContext } from '../../hooks';
import { ThemedClassName } from '../../util';
import { DensityProvider } from '../DensityProvider';

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
    const Icon = open ? CaretDown : CaretRight;
    return (
      <ListPrimitiveItemOpenTrigger
        {...props}
        className={tx('list.item.openTrigger', 'list__listItem__openTrigger', { density }, classNames)}
        ref={forwardedRef}
      >
        {children || (
          <Icon
            {...{
              weight: 'bold',
              className: tx('list.item.openTriggerIcon', 'list__listItem__openTrigger__icon', {}),
            }}
          />
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
} = {
  Root: ListItemRoot,
  Endcap: ListItemEndcap,
  Heading: ListItemHeading,
  OpenTrigger: ListItemOpenTrigger,
  CollapsibleContent: ListItemCollapsibleContent,
  MockOpenTrigger: MockListItemOpenTrigger,
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
