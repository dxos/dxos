//
// Copyright 2020 DXOS.org
//

import moment from 'moment';
import React from 'react';
import { CopyToClipboard } from 'react-copy-to-clipboard';

import IconButton from '@mui/material/IconButton';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import green from '@mui/material/colors/green';
import red from '@mui/material/colors/red';
import { makeStyles } from '@mui/styles';
import YesIcon from '@mui/icons-material/CheckCircleOutline';
import LinkIcon from '@mui/icons-material/Link';
import NoIcon from '@mui/icons-material/RadioButtonUnchecked';

import { keyTypeName } from '@dxos/credentials';
import { truncateString } from '@dxos/debug';

// TODO(burdon): Move to dxos/react-ux.
const BooleanIcon = ({ yes = false, error = false }) => {
  return (yes
    ? <YesIcon style={{ color: green[500] }} />
    : <NoIcon style={{ color: error ? red[500] : 'transparent' }} />
  );
};

// TODO(burdon): React component to show truncated key with click-to-copy.

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
  colAdded: {
    width: 180
  }
}));

const KeyTable = ({ keys }) => {
  const classes = useStyle();

  const sorter = (a, b) => (a.type < b.type ? -1 : a.type > b.type ? 1 : a.own ? -1 : 1);

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
                {truncateString(key, 8)}
                <CopyToClipboard text={key} onCopy={value => console.log(value)}>
                  <IconButton
                    color='inherit'
                    aria-label='copy to clipboard'
                    title='Copy to clipboard'
                    edge='end'
                  >
                    <LinkIcon />
                  </IconButton>
                </CopyToClipboard>
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
