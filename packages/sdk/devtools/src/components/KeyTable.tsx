//
// Copyright 2020 DXOS.org
//

import { Table, TableBody, TableCell, TableHead, TableRow } from '@mui/material';
import { makeStyles } from '@mui/styles';
import moment from 'moment';
import React from 'react';

import { keyTypeName } from '@dxos/credentials';
import { CopyText } from '@dxos/react-components';
import { BooleanIcon } from '@dxos/react-framework';

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
  mono: {
    fontFamily: 'monospace',
    fontSize: 'medium'
  },
  colType: {
    width: 180
  },
  colKey: {},
  colAdded: {
    width: 180
  }
}));

// TODO(burdon): Use type.
const sorter = (a: any, b: any) => (a.type < b.type ? -1 : a.type > b.type ? 1 : a.own ? -1 : 1);

const KeyTable = ({ keys }: { keys: any[] }) => {
  const classes = useStyle();

  return (
    <Table stickyHeader size='small' className={classes.table}>
      <TableHead>
        <TableRow>
          <TableCell className={classes.colType}>Type</TableCell>
          <TableCell className={classes.colKey}>Public Key</TableCell>
          <TableCell className={classes.colAdded}>Added</TableCell>
          <TableCell>Ours</TableCell>
          <TableCell>Trust</TableCell>
        </TableRow>
      </TableHead>
      <TableBody>
        {keys.sort(sorter).map(({ type, publicKey, added, own, trusted }) => {
          const key = publicKey.toHex();
          return (
            <TableRow key={key}>
              <TableCell> {keyTypeName(type)} </TableCell>
              <TableCell className={classes.mono} title={key}>
                <CopyText value={key} />
              </TableCell>
              <TableCell title={added}>{moment(added).fromNow()}</TableCell>
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
  );
};

export default KeyTable;
