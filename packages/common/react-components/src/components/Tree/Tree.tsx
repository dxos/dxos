//
// Copyright 2023 DXOS.org
//

import React, { forwardRef } from 'react';

import {
  List,
  LIST_ITEM_NAME,
  ListItem,
  ListItemCollapsibleContent,
  ListItemCollapsibleContentProps,
  ListItemHeading,
  ListItemHeadingProps,
  ListItemProps,
  ListProps,
  ListScopedProps,
  useListItemContext
} from '../List';

type TreeProps = ListProps;

type TreeItemProps = ListItemProps;

const TreeRoot = (props: TreeProps) => {
  return <List {...props} collapsible slots={{ ...props.slots, root: { ...props.slots?.root, role: 'tree' } }} />;
};

type TreeBranchProps = ListScopedProps<Omit<TreeProps, 'labelId'>>;

const TreeBranch = forwardRef<HTMLOListElement, TreeBranchProps>(
  ({ __listScope, ...props }: TreeBranchProps, forwardedRef) => {
    const { headingId } = useListItemContext(LIST_ITEM_NAME, __listScope);

    return (
      <List
        collapsible
        {...props}
        labelId={headingId}
        slots={{ ...props.slots, root: { ...props.slots?.root, role: 'none' } }}
        ref={forwardedRef}
      />
    );
  }
);

const TreeItem = (props: ListItemProps) => {
  return <ListItem {...props} slots={{ ...props.slots, root: { ...props.slots?.root, role: 'treeitem' } }} />;
};

type TreeItemHeadingProps = ListItemHeadingProps;

const TreeItemHeading = ListItemHeading;

type TreeItemBodyProps = ListItemCollapsibleContentProps;

const TreeItemBody = ListItemCollapsibleContent;

export { TreeRoot, TreeBranch, TreeItem, TreeItemHeading, TreeItemBody };

export type { TreeProps, TreeItemProps, TreeItemHeadingProps, TreeItemBodyProps };
