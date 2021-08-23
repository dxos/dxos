//
// Copyright 2020 DXOS.org
//

import clsx from 'clsx';
import ColorHash from 'color-hash';
import React, { useState } from 'react';

import Link from '@material-ui/core/Link';
import Table from '@material-ui/core/Table';
import TableBody from '@material-ui/core/TableBody';
import TableCell from '@material-ui/core/TableCell';
import TableContainer from '@material-ui/core/TableContainer';
import TableHead from '@material-ui/core/TableHead';
import TableRow from '@material-ui/core/TableRow';
import blue from '@material-ui/core/colors/blue';
import red from '@material-ui/core/colors/red';
import { makeStyles } from '@material-ui/core/styles';

import { truncateString } from '@dxos/debug';
import { JsonTreeView } from '@dxos/react-framework';

const colorHash = new ColorHash({ saturation: 1 });

const useStyles = makeStyles(() => ({
  system: {
    backgroundColor: red[50]
  },

  outerCell: {
    verticalAlign: 'top'
  },

  innerCell: {
    verticalAlign: 'top'
  },

  block: {},

  meta: {
    fontSize: 14,
    fontFamily: 'monospace'
  }
}));

const color = (type) => {
  return type === 'halo' ? red[500] : blue[500];
};

const Feed = ({ messages, onSelect }) => {
  const classes = useStyles();

  // Dynamically expand for performance.
  const [expanded, setExpanded] = useState({});
  const handleExpand = (rowKey) => {
    setExpanded({ ...expanded, ...{ [rowKey]: true } });
  };

  return (
    <TableContainer>
      <Table stickyHeader size='small'>
        <TableHead>
          <TableRow>
            <TableCell className={classes.outerCell}>Feed</TableCell>
            <TableCell className={classes.outerCell}>#</TableCell>
            <TableCell className={classes.outerCell}>Type</TableCell>
            <TableCell className={classes.outerCell} style={{ width: '60%' }}>Payload</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {
            // Messages with feed metadata.
            messages.map(({ key, seq, data }) => {
              const feedKey = key;

              const rowKey = `key-${feedKey}-${seq}`;
              const type = getType(data);

              return (
                <TableRow key={rowKey} size='small' className={clsx({ [classes.system]: type === 'halo' })}>
                  {/* Feed */}
                  <TableCell
                    className={clsx(classes.outerCell, classes.meta)}
                    style={{ color: colorHash.hex(feedKey) }}
                    title={feedKey}
                  >
                    {truncateString(feedKey, 8)}
                  </TableCell>

                  {/* # */}
                  <TableCell className={clsx(classes.outerCell, classes.block)}>{seq}</TableCell>

                  {/* Type */}
                  <TableCell className={classes.outerCell}>
                    <Link
                      style={{ color: color(type), cursor: 'pointer' }}
                      onClick={() => onSelect?.(data)}
                    >
                      {type}
                    </Link>
                  </TableCell>

                  {/* Payload */}
                  {/* TODO(burdon): Custom rendering of links for public keys. */}
                  <TableCell className={classes.outerCell}>
                    <JsonTreeView
                      size='small'
                      root='data'
                      depth={0}
                      data={expanded[rowKey] ? data : { dummy: undefined }}
                      onSelect={() => handleExpand(rowKey)}
                    />
                  </TableCell>
                </TableRow>
              );
            })
          }
        </TableBody>
      </Table>
    </TableContainer>
  );
};

function getType (message) {
  if (message.echo) {
    if (message.echo.genesis) {
      return 'item genesis';
    } else if (message.echo.itemMutation) {
      return 'item mutation';
    } else if (message.echo.mutation) {
      return 'model mutation';
    }
  } else if (message.halo) {
    if (message.halo.payload?.__type_url === 'dxos.credentials.SignedMessage') {
      return message.halo.payload.signed?.payload?.__type_url ?? 'dxos.credentials.SignedMessage';
    } else {
      return message.halo.payload?.__type_url ?? 'halo message';
    }
  } else {
    return 'empty message';
  }
}

export default Feed;
