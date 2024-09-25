//
// Copyright 2024 DXOS.org
//
import React from 'react';

import {
  Grid,
  type GridRootProps,
  type GridContentProps,
  useGridContext,
  type GridScopedProps,
} from '@dxos/react-ui-grid';

import { CellEditor } from '../CellEditor';

export type GridSheetProps = Omit<GridRootProps, 'editing' | 'defaultEditing'> & GridContentProps;

const GridSheetCellEditor = ({ __gridScope }: GridScopedProps<{}>) => {
  const { editing, editBox, setEditing } = useGridContext('GridSheetCellEditor', __gridScope);
  return editing ? <CellEditor variant='grid' autoFocus box={editBox} onBlur={() => setEditing(null)} /> : null;
};

export const GridSheet = ({ id, onEditingChange, ...props }: GridSheetProps) => {
  return (
    <Grid.Root id={id}>
      <GridSheetCellEditor />
      <Grid.Content {...props} />
    </Grid.Root>
  );
};
