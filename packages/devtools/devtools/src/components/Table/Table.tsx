//
// Copyright 2020 DXOS.org
//

import React, { FunctionComponent } from 'react';

import {
  Box,
  Table as MuiTable,
  TableProps as MuiTableProps,
  TableCell as MuiTableCell,
  TableCellProps as MuiTableCellProps,
  TableContainer,
  styled
} from '@mui/material';

export type TableProps = MuiTableProps

/**
 * Scrolling table.
 */
export const Table = ({ children, ...props }: TableProps) => (
  <Box sx={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
    <TableContainer sx={{ height: '100%' }}>
      <MuiTable
        stickyHeader
        size='small'
        sx={{
          '& .MuiTableCell-head': {
            fontVariant: 'all-petite-caps'
          },
          '& .MuiTableCell-root': {
            overflow: 'hidden',
            whiteSpace: 'nowrap',
            textOverflow: 'ellipsis'
          }
        }}
        {...props}
      >
        {children}
      </MuiTable>
    </TableContainer>
  </Box>
);

interface TableCellProps extends MuiTableCellProps {
  monospace?: boolean
}

const StyledTableCell = styled(MuiTableCell, {
  shouldForwardProp: (prop) => prop !== 'monospace'
})<TableCellProps>(({ monospace }) => ({
  verticalAlign: 'center',
  fontSize: 14,
  fontFamily: monospace ? 'monospace' : ''
}));

export const TableCell: FunctionComponent<TableCellProps> = StyledTableCell;
