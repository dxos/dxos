//
// Copyright 2020 DXOS.org
//

import React from 'react';

import { TableBody, TableHead, TableRow } from '@mui/material';

import { truncateString } from '@dxos/debug';
import { Timeframe } from '@dxos/echo-protocol';
import { CopyText, HashIcon } from '@dxos/react-components';

import { SubscribeToPartiesResponse } from '../proto';
import { BooleanIcon } from './BooleanIcon';
import { Table, TableCell } from './Table';

const TimeFrame = ({ value }: { value: Timeframe }) => {
  return (
    <div>
      {value.frames().map(([key, seq]) => (
        <div key={key.toHex()}>
          <span>{truncateString(key.toHex(), 8)}</span>&nbsp;
          <span>[{seq}]</span>
        </div>
      ))}
    </div>
  );
};

export interface PartyTableProps {
  parties: SubscribeToPartiesResponse.PartyInfo[]
}

export const PartyTable = ({ parties }: PartyTableProps) => {
  return (
    <Table
      stickyHeader
      size='small'
    >
      <TableHead>
        <TableRow>
          <TableCell sx={{ width: 40 }} />
          <TableCell>Party Key</TableCell>
          <TableCell sx={{ width: 40 }}>Open</TableCell>
          <TableCell sx={{ width: 40 }}>Active</TableCell>
          <TableCell sx={{ width: 40 }}>Feeds</TableCell>
          <TableCell>TimeFrame</TableCell>
        </TableRow>
      </TableHead>
      <TableBody>
        {parties.map(({ key, isOpen, isActive, feedKeys, timeframe }) => {
          return (
            <TableRow key={key}>
              <TableCell>
                <HashIcon value={key!} />
              </TableCell>
              <TableCell title={key}>
                <CopyText monospace variant='h6' value={key} length={8} />
              </TableCell>
              <TableCell align='center'>
                <BooleanIcon value={isOpen} />
              </TableCell>
              <TableCell align='center'>
                <BooleanIcon value={isActive} />
              </TableCell>
              <TableCell align='center'>
                {feedKeys}
              </TableCell>
              <TableCell monospace>
                {timeframe && (
                  <TimeFrame value={timeframe as any} />
                )}
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
};
