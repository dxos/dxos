//
// Copyright 2024 DXOS.org
//
import React, { useState } from 'react';

import { Grid, type GridRootProps, type GridContentProps, type GridEditing } from '@dxos/react-ui-grid';

export type GridSheetProps = Omit<GridRootProps, 'editing' | 'defaultEditing'> & GridContentProps;

export const GridSheet = ({ id, onEditingChange, ...props }: GridSheetProps) => {
  const [editing, setEditing] = useState<GridEditing>(null);
  console.log('[editing]', editing);
  return (
    <Grid.Root
      id={id}
      editing={editing}
      onEditingChange={(next: GridEditing) => {
        setEditing(next);
        onEditingChange?.(next);
      }}
    >
      <Grid.Content {...props} />
    </Grid.Root>
  );
};
