//
// Copyright 2023 DXOS.org
//

import React, { type ComponentPropsWithoutRef, type FC, type ForwardRefExoticComponent, forwardRef } from 'react';

import { type ThemedClassName } from '../../util';

import {
  LIST_ITEM_NAME,
  List,
  ListItem,
  type ListItemCollapsibleContentProps,
  type ListItemHeadingProps,
  type ListItemOpenTriggerProps,
  type ListItemRootProps,
  type ListProps,
  type ListScopedProps,
  useListItemContext,
} from './List';
import { TreeDropIndicator } from './TreeDropIndicator';

type TreeRootProps = ListProps;

type TreeItemProps = ListItemRootProps;

const TreeRoot = forwardRef<HTMLOListElement, TreeRootProps>((props, forwardedRef) => {
  return <List {...props} ref={forwardedRef} />;
});

type TreeBranchProps = TreeRootProps;

const TreeBranch = forwardRef<HTMLOListElement, ListScopedProps<TreeBranchProps>>(
  ({ __listScope, ...props }, forwardedRef) => {
    const { headingId } = useListItemContext(LIST_ITEM_NAME, __listScope);
    return <List {...props} aria-labelledby={headingId} ref={forwardedRef} />;
  },
);

const TreeItemRoot = forwardRef<HTMLLIElement, ListItemRootProps>((props, forwardedRef) => {
  return <ListItem.Root role='treeitem' {...props} ref={forwardedRef} />;
});

type TreeItemHeadingProps = ListItemHeadingProps;

const TreeItemHeading = ListItem.Heading;

type TreeItemOpenTriggerProps = ListItemOpenTriggerProps;

const TreeItemOpenTrigger = ListItem.OpenTrigger;

const MockTreeItemOpenTrigger = ListItem.MockOpenTrigger;

type TreeItemBodyProps = ListItemCollapsibleContentProps;

const TreeItemBody: ForwardRefExoticComponent<TreeItemBodyProps> = ListItem.CollapsibleContent;

export const Tree = { Root: TreeRoot, Branch: TreeBranch };
export const TreeItem: {
  Root: ForwardRefExoticComponent<TreeItemProps>;
  Heading: ForwardRefExoticComponent<TreeItemHeadingProps>;
  Body: ForwardRefExoticComponent<TreeItemBodyProps>;
  OpenTrigger: ForwardRefExoticComponent<TreeItemOpenTriggerProps>;
  MockOpenTrigger: FC<ThemedClassName<Omit<ComponentPropsWithoutRef<'div'>, 'children'>>>;
  DropIndicator: typeof TreeDropIndicator;
} = {
  Root: TreeItemRoot,
  Heading: TreeItemHeading,
  Body: TreeItemBody,
  OpenTrigger: TreeItemOpenTrigger,
  MockOpenTrigger: MockTreeItemOpenTrigger,
  DropIndicator: TreeDropIndicator,
};

export type { TreeRootProps, TreeItemProps, TreeItemHeadingProps, TreeItemBodyProps, TreeItemOpenTriggerProps };
