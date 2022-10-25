//
// Copyright 2022 DXOS.org
//

import { css } from '@emotion/css';
import clsx from 'clsx';
import React, { useMemo, useState } from 'react';

import { Box } from '@mui/material';
import {
  DataGrid,
  GridCellParams,
  GridColDef,
  GridSelectionModel,
  GridValueGetterParams
} from '@mui/x-data-grid';

import { truncateKey } from '@dxos/debug';
import { Item } from '@dxos/echo-db';
import { ObjectModel } from '@dxos/object-model';
import { ItemAdapter } from '@dxos/react-client-testing';

const defaultStyles = css`
  .monospace {
    font-family: monospace;
  }
`;

const useColumns = (itemAdapter: ItemAdapter): GridColDef[] =>
  useMemo(
    () => [
      {
        field: 'id',
        headerName: 'ID',
        width: 120,
        valueGetter: (params: GridValueGetterParams) =>
          truncateKey(params.row.id, 4),
        cellClassName: () => 'monospace'
      },
      {
        field: 'type',
        headerName: 'Type',
        width: 160,
        cellClassName: (params: GridCellParams<string>) =>
          params.row.type.replace(/\W/g, '_')
      },
      {
        field: 'name',
        headerName: 'Name',
        flex: 1,
        valueGetter: (params: GridValueGetterParams) =>
          itemAdapter.title(params.row as any) // TODO(dmaretskyi): Not sure whats going on here (cc TODO(richburdon)).
      }
    ],
    []
  );

export interface EchoGridProps {
  items?: Item<ObjectModel>[];
  itemAdapter: ItemAdapter;
  styles?: any;
}

export const EchoGrid = ({
  items = [],
  itemAdapter,
  styles
}: EchoGridProps) => {
  const columns = useColumns(itemAdapter);
  const [selectionModel, setSelectionModel] = useState<GridSelectionModel>([]);

  return (
    <Box
      className={clsx(defaultStyles, styles)}
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
