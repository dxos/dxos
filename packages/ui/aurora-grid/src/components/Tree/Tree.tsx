//
// Copyright 2023 DXOS.org
//

import React from 'react';

// TODO(burdon): Tree data model that provides a pure abstraction of the plugin Graph.
//  - The Tree (like Stack, Grid) is a high level container that assembles Radix style Aurora components from a model.
//  - Models in general should be easily mapped from the Graph and/or ECHO queries.
//  - See: https://master--5fc05e08a4a65d0021ae0bf2.chromatic.com/?path=/story/examples-tree-sortable--basic-setup

type TreeRootProps = {
  id: string;
};

const TreeRoot = ({ id }: TreeRootProps) => {
  return <div />;
};

// TODO(burdon): Draggable item.
// const TreeTile = () => {
//   return <div />;
// };

// TODO(burdon): Pure component that is used by the mosaic overlay.
// const TreeItem = () => {
//   return <div />;
// };

export const Tree = {
  Root: TreeRoot,
};

export type { TreeRootProps };
