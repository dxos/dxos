//
// Copyright 2023 DXOS.org
//

import { CaretDown, CaretRight, DotsSixVertical } from '@phosphor-icons/react';
import { Slot } from '@radix-ui/react-slot';
import React, { ComponentPropsWithoutRef } from 'react';

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
  DragEndEvent
} from '@dxos/react-list';

import { useDensityContext, useThemeContext } from '../../hooks';
import { ThemedClassName } from '../../util';
import { DensityProvider } from '../DensityProvider';

type ListProps = ThemedClassName<ListPrimitiveProps> & { density?: Density };

const useListDensity = ({ density, variant }: Pick<ListProps, 'density' | 'variant'>) => {
  const contextDensity = useDensityContext(density);
  return variant === 'ordered-draggable' ? 'coarse' : contextDensity ?? 'coarse';
};

const List = ({ className, children, ...props }: ListProps) => {
  const { tx } = useThemeContext();
  const density = useListDensity(props);

  return (
    <DensityProvider density={density}>
      <ListPrimitive {...props} className={tx('list.root', 'list', {}, className)}>
        {children}
      </ListPrimitive>
    </DensityProvider>
  );
};

type ListItemEndcapProps = ThemedClassName<ComponentPropsWithoutRef<'div'>> & { asChild?: boolean };

const ListItemEndcap = ({ children, className, asChild, ...props }: ListItemEndcapProps) => {
  const Root = asChild ? Slot : 'div';
  const density = useDensityContext();
  const { tx } = useThemeContext();
  return (
    <Root
      {...(!asChild && { role: 'none' })}
      {...props}
      className={tx('list.item.endcap', 'list__listItem__endcap', { density }, className)}
    >
      {children}
    </Root>
  );
};

const MockListItemOpenTrigger = ({
  className,
  ...props
}: ThemedClassName<Omit<ComponentPropsWithoutRef<'div'>, 'children'>>) => {
  const density = useDensityContext();
  const { tx } = useThemeContext();
  return (
    <div
      role='none'
      {...props}
      className={tx('list.item.openTrigger', 'list__listItem__openTrigger--mock', { density }, className)}
    />
  );
};

const MockListItemDragHandle = ({
  className,
  ...props
}: ThemedClassName<Omit<ComponentPropsWithoutRef<'div'>, 'children'>>) => {
  const { tx } = useThemeContext();
  return (
    <div role='none' {...props} className={tx('list.item.dragHandle', 'list__listItem__dragHandle', {}, className)} />
  );
};

type ListItemHeadingProps = ThemedClassName<ListPrimitiveItemHeadingProps>;

const ListItemHeading = ({ children, className, ...props }: ListItemHeadingProps) => {
  const { tx } = useThemeContext();
  const density = useDensityContext();
  return (
    <ListPrimitiveItemHeading
      {...props}
      className={tx('list.item.heading', 'list__listItem__heading', { density }, className)}
    >
      {children}
    </ListPrimitiveItemHeading>
  );
};

type ListItemDragHandleProps = ThemedClassName<ListPrimitiveItemDragHandleProps>;

const ListItemDragHandle = ({ className, children, ...props }: ListItemDragHandleProps) => {
  const { tx } = useThemeContext();
  return (
    <ListPrimitiveItemDragHandle
      {...props}
      className={tx('list.item.dragHandle', 'list__listItem__dragHandle', {}, className)}
    >
      {children || (
        <DotsSixVertical className={tx('list.item.dragHandleIcon', 'list__listItem__dragHandle__icon', {})} />
      )}
    </ListPrimitiveItemDragHandle>
  );
};

type ListItemOpenTriggerProps = ThemedClassName<ListPrimitiveItemOpenTriggerProps>;

const ListItemOpenTrigger = ({ __listItemScope, className, children, ...props }: ListItemOpenTriggerProps) => {
  const { tx } = useThemeContext();
  const density = useDensityContext();
  const { toggleOpenLabel } = useListContext(LIST_NAME, __listItemScope);
  const { open } = useListItemContext(LIST_ITEM_NAME, __listItemScope);
  const Icon = open ? CaretDown : CaretRight;
  return (
    <ListPrimitiveItemOpenTrigger
      {...props}
      className={tx('list.item.openTrigger', 'list__listItem__openTrigger', { density }, className)}
    >
      {typeof toggleOpenLabel === 'string' ? <span className='sr-only'>{toggleOpenLabel}</span> : toggleOpenLabel}
      {children || (
        <Icon
          {...{
            weight: 'bold',
            className: tx('list.item.openTriggerIcon', 'list__listItem__openTrigger__icon', {})
          }}
        />
      )}
    </ListPrimitiveItemOpenTrigger>
  );
};

type ListItemProps = ThemedClassName<ListPrimitiveItemProps>;

const ListItem = ({ className, children, ...props }: ListItemProps) => {
  const { tx } = useThemeContext();
  const density = useDensityContext();
  return (
    <ListPrimitiveItem {...props} className={tx('list.item.root', 'list__listItem', { density }, className)}>
      {children}
    </ListPrimitiveItem>
  );
};

export {
  List,
  ListItem,
  ListItemEndcap,
  ListItemHeading,
  ListItemDragHandle,
  ListItemOpenTrigger,
  ListItemCollapsibleContent,
  MockListItemOpenTrigger,
  MockListItemDragHandle,
  useListDensity,
  useListContext,
  useListItemContext,
  LIST_NAME,
  LIST_ITEM_NAME,
  arrayMove
};

export type {
  ListProps,
  ListScopedProps,
  ListItemProps,
  ListItemScopedProps,
  ListItemEndcapProps,
  ListItemHeadingProps,
  ListItemDragHandleProps,
  ListItemOpenTriggerProps,
  ListItemCollapsibleContentProps,
  DragEndEvent
};
