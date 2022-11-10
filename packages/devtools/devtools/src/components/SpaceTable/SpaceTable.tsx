//
// Copyright 2020 DXOS.org
//

import React from 'react';

import { TableBody, TableHead, TableRow } from '@mui/material';

import { truncateKey } from '@dxos/debug';
import { SubscribeToPartiesResponse } from '@dxos/protocols/proto/dxos/devtools/host';
import { CopyText, HashIcon } from '@dxos/react-components';
import { Timeframe } from '@dxos/timeframe';

import { BooleanIcon } from '../BooleanIcon/BooleanIcon';
import { Table, TableCell } from '../Table';

const TimeFrame = ({ value }: { value: Timeframe }) => (
  <div>
    {value.frames().map(([key, seq]) => (
      <div key={key.toHex()}>
        <span>{truncateKey(key.toHex(), 8)}</span>&nbsp;
        <span>[{seq}]</span>
      </div>
    ))}
  </div>
);

export interface SpaceTableProps {
  parties: SubscribeToPartiesResponse.SpaceInfo[];
}

export const SpaceTable = ({ parties }: SpaceTableProps) => (
  <Table stickyHeader size='small'>
    <TableHead>
      <TableRow>
        <TableCell sx={{ width: 40 }} />
        <TableCell>Space Key</TableCell>
        <TableCell sx={{ width: 40 }}>Open</TableCell>
        <TableCell sx={{ width: 40 }}>Genesis Feed</TableCell>
        <TableCell sx={{ width: 40 }}>Control Feed</TableCell>
        <TableCell sx={{ width: 40 }}>Data Feed</TableCell>
        <TableCell>TimeFrame</TableCell>
      </TableRow>
    </TableHead>
    <TableBody>
      {parties.map(({ key, isOpen, genesisFeed, controlFeed, dataFeed, timeframe }) => (
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
            <HashIcon value={genesisFeed.toHex()!} />
            <CopyText monospace variant='h6' value={genesisFeed!.toHex()} length={8} />
          </TableCell>
          <TableCell align='center'>
            <HashIcon value={controlFeed.toHex()!} />
            <CopyText monospace variant='h6' value={controlFeed!.toHex()} length={8} />
          </TableCell>
          <TableCell align='center'>
            <HashIcon value={dataFeed.toHex()!} />
            <CopyText monospace variant='h6' value={dataFeed!.toHex()} length={8} />
          </TableCell>
          <TableCell monospace>{timeframe && <TimeFrame value={timeframe as any} />}</TableCell>
        </TableRow>
      ))}
    </TableBody>
  </Table>
);
