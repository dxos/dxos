//
// Copyright 2021 DXOS.org
//

import React from 'react';

import { PublicKey } from '@dxos/crypto';
import { SwarmInfo } from '@dxos/network-manager';
import { BooleanIcon, TruncateCopy } from '@dxos/react-framework';

import { IconButton, makeStyles, Table, TableBody, TableCell, TableHead, TableRow } from '@material-ui/core';
import InfoIcon from '@material-ui/icons/Info';

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
};

const SwarmTable = ({ swarms, onClick }: SwarmListProps) => {
  const classes = useStyle();

  return (
    <Table stickyHeader size='small' className={classes.table}>
      <TableHead>
        <TableRow>
          <TableCell className={classes.colLabel}> Label </TableCell>
          <TableCell className={classes.colTopic}> Topic </TableCell>
          <TableCell> Active  </TableCell>
          <TableCell> Info </TableCell>
        </TableRow>
      </TableHead>
      <TableBody>
        {swarms.map(swarm => (
          <TableRow key={swarm.id.toHex()}>
            <TableCell className={classes.colLabel}>
              {swarm.label && (<TruncateCopy text={swarm.label}/>)}
            </TableCell>
            <TableCell className={classes.colLabel}>
              <TruncateCopy text={swarm.topic.toHex()}/>
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
