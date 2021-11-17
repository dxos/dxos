//
// Copyright 2020 DXOS.org
//

import React from 'react';

import { Box, Table as MuiTable, TableProps as MuiTableProps, TableContainer } from '@mui/material';

export type TableProps = MuiTableProps

/**
 * Scrolling table.
 */
export const Table = ({ children, ...props }: TableProps) => {
  return (
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
            },
            '& .MuiTableCell-root.monospace': {
              fontFamily: 'monospace',
              fontSize: 'medium'
            }
          }}
          {...props}
        >
          {children}
        </MuiTable>
      </TableContainer>
    </Box>
  );
};
