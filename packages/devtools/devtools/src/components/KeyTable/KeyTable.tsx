//
// Copyright 2020 DXOS.org
//

import React from 'react';

import { TableBody, TableHead, TableRow } from '@mui/material';

import { PublicKey } from '@dxos/keys';
import { KeyRecord } from '@dxos/protocols/proto/dxos/halo/keyring';
import { CopyText } from '@dxos/react-components';
import { humanize } from '@dxos/util';

import { Avatar } from '../Avatar';
import { Table, TableCell } from '../Table';

export interface KeyTableProps {
  keys: KeyRecord[];
}

export const KeyTable = ({ keys }: KeyTableProps) => (
  <Table stickyHeader size='small'>
    <TableHead>
      <TableRow>
        <TableCell sx={{ width: 80 }}>Icon</TableCell>
        <TableCell>Public Key</TableCell>
        <TableCell sx={{ width: 40 }}>Humanized Label</TableCell>
      </TableRow>
    </TableHead>
    <TableBody>
      {keys.map(({ publicKey }) => {
        const key = PublicKey.from(publicKey).toHex();
        return (
          <TableRow key={key}>
            <TableCell>
              <Avatar size={12} fallbackValue={PublicKey.from(key).toHex()} />
            </TableCell>
            <TableCell title={key}>
              <CopyText monospace variant='h6' value={key} length={8} />
            </TableCell>
            <TableCell>
              <CopyText monospace variant='h6' value={humanize(key)} />
            </TableCell>
          </TableRow>
        );
      })}
    </TableBody>
  </Table>
);
