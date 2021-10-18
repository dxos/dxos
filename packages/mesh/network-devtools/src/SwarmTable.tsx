//
// Copyright 2021 DXOS.org
//

import InfoIcon from '@mui/icons-material/Info';
import { IconButton, Table, TableBody, TableCell, TableHead, TableRow } from '@mui/material';
import { makeStyles } from '@mui/styles';
import React from 'react';

import { PublicKey } from '@dxos/crypto';
import { SwarmInfo } from '@dxos/network-manager';
import { CopyText } from '@dxos/react-components';
import { BooleanIcon } from '@dxos/react-framework';

// TODO(wittjosiah): Refactor, makeStyles is deprecated.
const useStyle = makeStyles(() => ({
  table: {
    '& .MuiTableCell-root': {
      whiteSpace: 'nowrap',
      overflow: 'hidden',
      textOverflow: 'ellipsis'
    },

    '& th': {
      fontVariant: 'all-petite-caps'
    }
  },

  colLabel: {
    maxWidth: 200
  },
  colTopic: {
    maxWidth: 200
  }
}));

export interface SwarmListProps {
  swarms: SwarmInfo[]
  onClick?: (id: PublicKey) => void
}

const SwarmTable = ({ swarms, onClick }: SwarmListProps) => {
  const classes = useStyle();

  return (
    <Table stickyHeader size='small' className={classes.table}>
      <TableHead>
        <TableRow>
          <TableCell className={classes.colLabel}>Label</TableCell>
          <TableCell className={classes.colTopic}>Topic</TableCell>
          <TableCell>Active</TableCell>
          <TableCell>Info</TableCell>
        </TableRow>
      </TableHead>
      <TableBody>
        {swarms.map(swarm => (
          <TableRow key={swarm.id.toHex()}>
            <TableCell className={classes.colLabel}>
              {swarm.label && (<CopyText value={swarm.label} />)}
            </TableCell>
            <TableCell className={classes.colLabel}>
              <CopyText value={swarm.topic.toHex()} />
            </TableCell>
            <TableCell> <BooleanIcon yes={swarm.isActive} /> </TableCell>
            <TableCell>
              <IconButton onClick={() => onClick?.(swarm.id)} title='Details'>
                <InfoIcon />
              </IconButton>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
};

export default SwarmTable;
