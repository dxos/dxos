//
// Copyright 2020 DXOS.org
//

import moment from 'moment'; // TODO(burdon): Remove.
import React from 'react';

import { Box, Table, TableBody, TableCell, TableContainer, TableHead, TableRow } from '@mui/material';

import { keyTypeName } from '@dxos/credentials';
import { CopyText } from '@dxos/react-components';
import { BooleanIcon } from '@dxos/react-framework';

import { KeyRecord } from '../proto/gen/dxos/halo/keys';

const styles = {
  monospace: {
    fontFamily: 'monospace',
    fontSize: 'medium'
  }
};

const sorter = (a: KeyRecord, b: KeyRecord) => (a.type < b.type ? -1 : a.type > b.type ? 1 : a.own ? -1 : 1);

export interface KeyTableProps {
  keys: KeyRecord[]
}

export const KeyTable = ({ keys }: KeyTableProps) => {
  return (
    <Box sx={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
      <TableContainer sx={{ height: '100%' }}>
        <Table
          stickyHeader
          size='small'
          sx={{
            '& .MuiTableCell-root': { // TODO(burdon): Standardize.
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis'
            },
            '& th': {
              fontVariant: 'all-petite-caps'
            }
          }}
        >
          <TableHead>
            <TableRow>
              <TableCell sx={{ width: 80 }}>Type</TableCell>
              <TableCell sx={styles.monospace}>Public Key</TableCell>
              <TableCell sx={{ width: 180 }}>Added</TableCell>
              <TableCell>Ours</TableCell>
              <TableCell>Trusted</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {keys.sort(sorter).map(({ type, publicKey, added, own, trusted }) => {
              const key = publicKey.toHex();
              return (
                <TableRow key={key}>
                  <TableCell> {keyTypeName(type)} </TableCell>
                  <TableCell title={key}>
                    <CopyText sx={styles.monospace} value={key} />
                  </TableCell>
                  <TableCell title={added}>
                    {moment(added).fromNow()}
                  </TableCell>
                  <TableCell align='center'>
                    <BooleanIcon yes={own} />
                  </TableCell>
                  <TableCell align='center'>
                    <BooleanIcon yes={trusted} error={!trusted} />
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
};
