//
// Copyright 2024 DXOS.org
//

import React from 'react';

import { type ShapeComponentProps } from '@dxos/react-ui-canvas-editor';

import { Box } from './common/index.ts';
import { type TableShape } from './table-def.ts';

export const TableComponent = ({ shape }: ShapeComponentProps<TableShape>) => {
  // const items = shape.node.items.value;

  return <Box shape={shape}></Box>;
};
