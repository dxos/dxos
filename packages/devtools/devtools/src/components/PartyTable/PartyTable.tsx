//
// Copyright 2020 DXOS.org
//

import React from 'react';

import { TableBody, TableHead, TableRow } from '@mui/material';

import { Party } from '@dxos/client';
import { CopyText, HashIcon } from '@dxos/react-components';

import { BooleanIcon } from '../BooleanIcon/BooleanIcon';
import { Table, TableCell } from '../Table';

export interface PartyTableProps {
  parties: Party[];
}

export const PartyTable = ({ parties }: PartyTableProps) => (
  <Table stickyHeader size='small'>
    <TableHead>
      <TableRow>
        <TableCell sx={{ width: 40 }} />
        <TableCell>Party Key</TableCell>
        <TableCell sx={{ width: 40 }}>Open</TableCell>
        <TableCell sx={{ width: 40 }}>Active</TableCell>
        {/* TODO(mykola): new PartyProxy API does not have 'feeds' and 'timeframe' props
        <TableCell sx={{ width: 40 }}>Feeds</TableCell>
        <TableCell>TimeFrame</TableCell> */}
      </TableRow>
    </TableHead>
    <TableBody>
      {parties.map(({ key, isOpen, isActive }) => (
        <TableRow key={key!.toHex()}>
          <TableCell>
            <HashIcon value={key!.toHex()!} />
          </TableCell>
          <TableCell title={key!.toHex()}>
            <CopyText monospace variant='h6' value={key!.toHex()} length={8} />
          </TableCell>
          <TableCell align='center'>
            <BooleanIcon value={isOpen} />
          </TableCell>
          <TableCell align='center'>
            <BooleanIcon value={isActive} />
          </TableCell>
          {/* <TableCell align='center'>{feeds!.length}</TableCell>
          <TableCell monospace>
            {timeframe && <TimeFrame value={timeframe as any} />}
          </TableCell> */}
        </TableRow>
      ))}
    </TableBody>
  </Table>
);
