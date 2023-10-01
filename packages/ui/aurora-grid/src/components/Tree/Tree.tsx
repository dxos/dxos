//
// Copyright 2023 DXOS.org
//

import React from 'react';

// TODO(burdon): Tree data model that provides a pure abstraction of the plugin Graph.
//  - The Tree (like Stack, Grid) is a high level container that assembles Radix style Aurora components from a model.

type TreeRootProps = {
  id: string;
};

const TreeRoot = ({ id }: TreeRootProps) => {
  return <div />;
};

const TreeTile = () => {
  return <div />;
};

const TreeItem = () => {
  return <div />;
};

export const Tree = {
  Root: TreeRoot,
};

export type { TreeRootProps };
