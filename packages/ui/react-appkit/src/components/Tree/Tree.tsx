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
  useListItemContext
} from '@dxos/aurora';

type TreeProps = ListProps;

type TreeItemProps = ListItemProps;

const TreeRoot: ForwardRefExoticComponent<TreeProps> = forwardRef<HTMLOListElement, TreeProps>(
  (props, forwardedRef) => {
    return <List {...props} ref={forwardedRef} />;
  }
);

type TreeBranchProps = ListScopedProps<TreeProps>;

const TreeBranch: ForwardRefExoticComponent<TreeBranchProps> = forwardRef<HTMLOListElement, TreeBranchProps>(
  ({ __listScope, ...props }, forwardedRef) => {
    const { headingId } = useListItemContext(LIST_ITEM_NAME, __listScope);
    return <List {...props} aria-labelledby={headingId} ref={forwardedRef} />;
  }
);

const TreeItem: ForwardRefExoticComponent<ListItemProps> = forwardRef<HTMLLIElement, ListItemProps>(
  (props, forwardedRef) => {
    return <ListItem role='treeitem' {...props} ref={forwardedRef} />;
  }
);

type TreeItemHeadingProps = ListItemHeadingProps;

type TreeItemOpenTriggerProps = ListItemOpenTriggerProps;

type TreeItemBodyProps = ListItemCollapsibleContentProps;

export {
  TreeRoot,
  TreeBranch,
  TreeItem,
  ListItemHeading as TreeItemHeading,
  ListItemCollapsibleContent as TreeItemBody,
  ListItemOpenTrigger as TreeItemOpenTrigger
};

export type { TreeProps, TreeItemProps, TreeItemHeadingProps, TreeItemBodyProps, TreeItemOpenTriggerProps };
