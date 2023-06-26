//
// Copyright 2023 DXOS.org
//

import { CaretDown, CaretRight, DotsSixVertical } from '@phosphor-icons/react';
import { Slot } from '@radix-ui/react-slot';
import React, { ComponentPropsWithoutRef, FC, forwardRef, ForwardRefExoticComponent } from 'react';

import { Density } from '@dxos/aurora-types';
import {
  List as ListPrimitive,
  ListProps as ListPrimitiveProps,
  ListScopedProps,
  ListItemHeading as ListPrimitiveItemHeading,
  ListItemHeadingProps as ListPrimitiveItemHeadingProps,
  ListItemDragHandle as ListPrimitiveItemDragHandle,
  ListItemDragHandleProps as ListPrimitiveItemDragHandleProps,
  ListItemOpenTrigger as ListPrimitiveItemOpenTrigger,
  ListItemOpenTriggerProps as ListPrimitiveItemOpenTriggerProps,
  ListItemCollapsibleContent,
  ListItemCollapsibleContentProps,
  ListItem as ListPrimitiveItem,
  ListItemProps as ListPrimitiveItemProps,
  ListItemScopedProps,
  LIST_NAME,
  useListContext,
  LIST_ITEM_NAME,
  useListItemContext,
  arrayMove,
  arrayMoveInPlace,
  DragEndEvent,
  DragOverEvent,
} from '@dxos/react-list';

import { useDensityContext, useThemeContext } from '../../hooks';
import { ThemedClassName } from '../../util';
import { DensityProvider } from '../DensityProvider';

type ListProps = ThemedClassName<ListPrimitiveProps> & { density?: Density };

const useListDensity = ({ density, variant }: Pick<ListProps, 'density' | 'variant'>) => {
  const contextDensity = useDensityContext(density);
  return variant === 'ordered-draggable' ? 'coarse' : contextDensity ?? 'coarse';
};

const List = forwardRef<HTMLOListElement, ListProps>(({ classNames, children, ...props }, forwardedRef) => {
  const { tx } = useThemeContext();
  const density = useListDensity(props);

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

const MockListItemDragHandle = ({
  classNames,
  ...props
}: ThemedClassName<Omit<ComponentPropsWithoutRef<'div'>, 'children'>>) => {
  const { tx } = useThemeContext();
  return (
    <div role='none' {...props} className={tx('list.item.dragHandle', 'list__listItem__dragHandle', {}, classNames)} />
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

type ListItemDragHandleProps = ThemedClassName<ListPrimitiveItemDragHandleProps>;

const ListItemDragHandle = forwardRef<HTMLDivElement, ListItemDragHandleProps>(
  ({ classNames, children, ...props }, forwardedRef) => {
    const { tx } = useThemeContext();
    return (
      <ListPrimitiveItemDragHandle
        {...props}
        className={tx('list.item.dragHandle', 'list__listItem__dragHandle', {}, classNames)}
        ref={forwardedRef}
      >
        {children || (
          <DotsSixVertical className={tx('list.item.dragHandleIcon', 'list__listItem__dragHandle__icon', {})} />
        )}
      </ListPrimitiveItemDragHandle>
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
  DragHandle: ForwardRefExoticComponent<ListItemDragHandleProps>;
  OpenTrigger: ForwardRefExoticComponent<ListItemOpenTriggerProps>;
  CollapsibleContent: ForwardRefExoticComponent<ListItemCollapsibleContentProps>;
  MockOpenTrigger: FC<ThemedClassName<Omit<ComponentPropsWithoutRef<'div'>, 'children'>>>;
  MockDragHandle: FC<ThemedClassName<Omit<ComponentPropsWithoutRef<'div'>, 'children'>>>;
} = {
  Root: ListItemRoot,
  Endcap: ListItemEndcap,
  Heading: ListItemHeading,
  DragHandle: ListItemDragHandle,
  OpenTrigger: ListItemOpenTrigger,
  CollapsibleContent: ListItemCollapsibleContent,
  MockOpenTrigger: MockListItemOpenTrigger,
  MockDragHandle: MockListItemDragHandle,
};

export {
  List,
  useListDensity,
  useListContext,
  useListItemContext,
  LIST_NAME,
  LIST_ITEM_NAME,
  arrayMove,
  arrayMoveInPlace,
};

export type {
  ListProps,
  ListScopedProps,
  ListItemRootProps,
  ListItemScopedProps,
  ListItemEndcapProps,
  ListItemHeadingProps,
  ListItemDragHandleProps,
  ListItemOpenTriggerProps,
  ListItemCollapsibleContentProps,
  DragEndEvent,
  DragOverEvent,
};
