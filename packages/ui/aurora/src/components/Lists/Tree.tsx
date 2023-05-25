//
// Copyright 2023 DXOS.org
//

import React, { forwardRef, ForwardRefExoticComponent } from 'react';

import {
  List,
  LIST_ITEM_NAME,
  ListItem,
  ListItemCollapsibleContent,
  ListItemCollapsibleContentProps,
  ListItemHeading,
  ListItemHeadingProps,
  ListItemOpenTrigger,
  ListItemOpenTriggerProps,
  ListItemProps,
  ListProps,
  ListScopedProps,
  MockListItemOpenTrigger,
  useListItemContext,
} from './List';

type TreeProps = ListProps;

type TreeItemProps = ListItemProps;

const TreeRoot: ForwardRefExoticComponent<TreeProps> = forwardRef<HTMLOListElement, TreeProps>(
  (props, forwardedRef) => {
    return <List {...props} ref={forwardedRef} />;
  },
);

type TreeBranchProps = TreeProps;

const TreeBranch: ForwardRefExoticComponent<TreeBranchProps> = forwardRef<
  HTMLOListElement,
  ListScopedProps<TreeBranchProps>
>(({ __listScope, ...props }, forwardedRef) => {
  const { headingId } = useListItemContext(LIST_ITEM_NAME, __listScope);
  return <List {...props} aria-labelledby={headingId} ref={forwardedRef} />;
});

const TreeItem: ForwardRefExoticComponent<ListItemProps> = forwardRef<HTMLLIElement, ListItemProps>(
  (props, forwardedRef) => {
    return <ListItem role='treeitem' {...props} ref={forwardedRef} />;
  },
);

type TreeItemHeadingProps = ListItemHeadingProps;

const TreeItemHeading = ListItemHeading;

type TreeItemOpenTriggerProps = ListItemOpenTriggerProps;

const TreeItemOpenTrigger = ListItemOpenTrigger;

const MockTreeItemOpenTrigger = MockListItemOpenTrigger;

type TreeItemBodyProps = ListItemCollapsibleContentProps;

const TreeItemBody: ForwardRefExoticComponent<TreeItemBodyProps> = ListItemCollapsibleContent;

export { TreeRoot, TreeBranch, TreeItem, TreeItemHeading, TreeItemBody, TreeItemOpenTrigger, MockTreeItemOpenTrigger };

export type { TreeProps, TreeItemProps, TreeItemHeadingProps, TreeItemBodyProps, TreeItemOpenTriggerProps };
