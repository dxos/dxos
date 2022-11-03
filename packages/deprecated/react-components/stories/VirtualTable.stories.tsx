//
// Copyright 2021 DXOS.org
//

import faker from 'faker';
import React, { ChangeEvent, useState } from 'react';

import { Check as TrueIcon, Clear as Falseicon } from '@mui/icons-material';
import { Box, Checkbox, IconButton } from '@mui/material';

import { GetRowHeightProps, DataCellProps, VirtualTable, FullScreen } from '../src';

faker.seed(123);

export default {
  title: 'react-components/VirtualTable',
  component: VirtualTable
};

const columns = [
  {
    key: 'checked',
    width: 120
  },
  {
    key: 'id',
    title: 'ID',
    width: 120
  },
  {
    key: 'title',
    title: 'Title',
    sortable: true
  },
  {
    key: 'status',
    width: 120,
    sortable: true
  }
];

const CustomDataCell = ({ key, row, value, rowSelected }: DataCellProps): JSX.Element | undefined => {
  switch (key) {
    case 'checked': {
      return (
        <div>
          <Checkbox
            checked={value}
            onChange={(event: ChangeEvent<HTMLInputElement>) => {
              row[key] = event.target.checked;
            }}
          />
        </div>
      );
    }

    case 'status': {
      return <IconButton>{value ? <TrueIcon /> : <Falseicon />}</IconButton>;
    }

    case 'title': {
      const lines = value.split('.').filter(Boolean);
      return (
        <>
          <Box
            sx={{
              display: 'flex',
              flexShrink: 0,
              flexDirection: 'column',
              justifyContent: 'center',
              height: 42
            }}
          >
            {lines[0]}
          </Box>
          {rowSelected && lines.slice(1).map((line: string, i: number) => <div key={i}>{line}</div>)}
        </>
      );
    }
  }
};

const Table = ({ rows }: { rows: any[] }) => {
  const [selected, setSelected] = useState<string[]>([]);
  const handleSelect = (next: string[]) => {
    if (next.length && selected[0] === next[0]) {
      setSelected([]);
    } else {
      setSelected(next);
    }
  };

  const getRowHeight = ({ row, rowSelected }: GetRowHeightProps) => {
    let h = 42;
    if (rowSelected) {
      const lines = row.title.split('.').filter(Boolean);
      if (lines.length > 1) {
        h += (lines.length - 1) * 21 + 10;
      }
    }

    return h;
  };

  return (
    <FullScreen>
      <VirtualTable
        rows={rows}
        columns={columns}
        getRowKey={(row) => row.id}
        getRowHeight={getRowHeight}
        selected={selected}
        onSelect={handleSelect}
        renderCell={CustomDataCell}
      />
    </FullScreen>
  );
};

export const Primary = () => {
  const rows = [...new Array(100)].map((_, i) => ({
    id: `item-${i}`,
    checked: i % 5 === 0,
    title: faker.lorem.sentences(1 + faker.datatype.number(3)),
    status: i % 3 === 0
  }));

  return <Table rows={rows} />;
};
