//
// Copyright 2024 DXOS.org
//
import React from 'react';

import { Grid, useGridContext, type GridScopedProps } from '@dxos/react-ui-grid';

import { type SheetModel } from '../../model';
import { CellEditor } from '../CellEditor';
import { type FormattingModel } from '../Sheet/formatting';
import { useSheetModel, type UseSheetModelProps } from '../Sheet/util';

const GridSheetCellEditor = ({ __gridScope }: GridScopedProps<{}>) => {
  const { id, editing, editBox, setEditing } = useGridContext('GridSheetCellEditor', __gridScope);
  return editing ? (
    <CellEditor variant='grid' autoFocus box={editBox} onBlur={() => setEditing(null)} gridId={id} />
  ) : null;
};

export type GridSheetProps = UseSheetModelProps;

const GridSheetImpl = ({ model }: { model: SheetModel; formatting: FormattingModel }) => {
  return (
    <Grid.Root id={model.id}>
      <GridSheetCellEditor />
      <Grid.Content />
    </Grid.Root>
  );
};

export const GridSheet = (props: GridSheetProps) => {
  const { model, formatting } = useSheetModel(props);
  return !model || !formatting ? null : <GridSheetImpl model={model} formatting={formatting} />;
};
