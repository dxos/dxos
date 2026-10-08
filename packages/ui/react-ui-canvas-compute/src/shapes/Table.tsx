//
// Copyright 2024 DXOS.org
//

import React from 'react';

import { Box, type ComputeNodeViewProps } from './common/index.ts';
import { type TableShape } from './table-def.ts';

export const TableComponent = ({ node: shape }: ComputeNodeViewProps<TableShape>) => {
  // const items = shape.node.items.value;

  return <Box shape={shape}></Box>;
};
