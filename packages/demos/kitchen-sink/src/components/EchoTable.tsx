//
// Copyright 2022 DXOS.org
//

import React, { useMemo, useState } from 'react';
import { Box } from '@mui/material';
import {
  DataGrid, GridCellParams, GridColDef, GridSelectionModel, GridValueGetterParams
} from '@mui/x-data-grid';

import { truncateString } from '@dxos/debug';
import { Item } from '@dxos/echo-db';
import { ObjectModel } from '@dxos/object-model';

import { styles } from './styles';

const useColumns = (labelProperty: string): GridColDef[] => {
  return useMemo(() => [
    {
      field: 'id',
      headerName: 'ID',
      width: 120,
      valueGetter: (params: GridValueGetterParams) => truncateString(params.row.id, 4),
      cellClassName: () => 'monospace'
    },
    {
      field: 'type',
      headerName: 'Type',
      width: 160,
      cellClassName: (params: GridCellParams<string>) => params.row.type.replace(/\W/g, '_')
    },
    {
      field: 'title',
      headerName: 'Title',
      flex: 1,
      valueGetter: (params: GridValueGetterParams) => params.row.model.getProperty(labelProperty)
    }
  ], []);
};

export interface EchoTableProps {
  items?: Item<ObjectModel>[]
  labelProperty?: string
}

export const EchoTable = ({
  items = [],
  labelProperty = 'title'
}: EchoTableProps) => {
  const columns = useColumns(labelProperty);
  const [selectionModel, setSelectionModel] = useState<GridSelectionModel>([]);

  return (
    <Box
      className={styles}
      sx={{
        display: 'flex',
        flex: 1,
        overflow: 'hidden'
      }}
    >
      <DataGrid
        autoPageSize
        density='compact'
        columns={columns}
        rows={items}
        selectionModel={selectionModel}
        onSelectionModelChange={(newSelectionModel: GridSelectionModel) => {
          setSelectionModel(newSelectionModel);
        }}
      />
    </Box>
  );
};
