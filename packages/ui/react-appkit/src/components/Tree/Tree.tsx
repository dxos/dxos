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

const TreeRoot = (props: TreeProps) => {
  return <List {...props} />;
};

type TreeBranchProps = ListScopedProps<TreeProps>;

// todo(thure): Ideally this should not have to be explicitly typed, blocked by https://github.com/microsoft/TypeScript/issues/47663
const TreeBranch: ForwardRefExoticComponent<TreeBranchProps> = forwardRef<HTMLOListElement, TreeBranchProps>(
  ({ __listScope, ...props }: TreeBranchProps) => {
    const { headingId } = useListItemContext(LIST_ITEM_NAME, __listScope);

    return <List {...props} aria-labelledby={headingId} />;
  }
);

const TreeItem = (props: ListItemProps) => {
  return <ListItem role='treeitem' {...props} />;
};

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
