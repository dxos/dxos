//
// Copyright 2020 DXOS.org
//

import ColorHash from 'color-hash';
import React, { useState } from 'react';

import {
  Box,
  Link,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  colors,
  useTheme
} from '@mui/material';

import { truncateString } from '@dxos/debug';
import { IFeedGenericBlock } from '@dxos/echo-protocol';
import { JsonTreeView } from '@dxos/react-components';

const colorHash = new ColorHash({ saturation: 0.5 });

const styles = {
  monospace: {
    fontSize: 'medium',
    fontFamily: 'monospace'
  }
};

const color = (type: string) => {
  return type === 'halo' ? colors.red[500] : colors.blue[500];
};

// TODO(burdon): Better way to determine type?
const getType = (message: any) => {
  if (message.echo) {
    if (message.echo.genesis) {
      return 'item genesis';
    } else if (message.echo.itemMutation) {
      return 'item mutation';
    } else if (message.echo.mutation) {
      return 'model mutation';
    }
  }

  if (message.halo) {
    if (message.halo.payload?.__type_url === 'dxos.credentials.SignedMessage') {
      return message.halo.payload.signed?.payload?.__type_url ?? 'dxos.credentials.SignedMessage';
    } else {
      return message.halo.payload?.__type_url ?? 'halo message';
    }
  }
}

export interface MessageTableProps {
  messages: IFeedGenericBlock<any>[]
  onSelect?: (data: any) => {}
}

/**
 * Hypercore message table.
 */
export const MessageTable = ({
  messages,
  onSelect
}: MessageTableProps) => {
  const theme = useTheme();

  // Dynamically expand for performance.
  const [expanded, setExpanded] = useState<{[index: string]: any}>({});
  const handleExpand = (rowKey: string) => {
    setExpanded({ ...expanded, ...{ [rowKey]: true } });
  };

  return (
    <Box sx={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
      <TableContainer sx={{ height: '100%' }}>
        <Table
          stickyHeader
          size='small'
          sx={{
            '& th': {
              fontVariant: 'all-petite-caps',
              verticalAlign: 'top'
            },
            '& td': {
              verticalAlign: 'top'
            }
          }}
        >
          <TableHead>
            <TableRow>
              <TableCell>Key</TableCell>
              <TableCell>Seq</TableCell>
              <TableCell>Type</TableCell>
              <TableCell sx={{ width: '90%' }}>Payload</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {
              // Messages with feed metadata.
              messages.map(({ key: feedKey, seq, data }) => {
                const rowKey = `key-${feedKey}-${seq}`;
                const type = getType(data);

                return (
                  <TableRow
                    key={rowKey}
                    sx={{
                      color: type === 'halo' ? theme.palette.warning.main : undefined
                    }}
                  >
                    {/* Feed. */}
                    <TableCell
                      sx={styles.monospace}
                      style={{ color: colorHash.hex(feedKey) }}
                      title={feedKey}
                    >
                      {truncateString(feedKey, 8)}
                    </TableCell>

                    {/* Number. */}
                    <TableCell sx={styles.monospace}>{seq}</TableCell>

                    {/* Type. */}
                    <TableCell>
                      <Link
                        style={{ color: color(type), cursor: 'pointer' }}
                        onClick={() => onSelect?.(data)}
                      >
                        {type}
                      </Link>
                    </TableCell>

                    {/* Payload. */}
                    {/* TODO(burdon): Custom rendering of links for public keys. */}
                    <TableCell>
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
    </Box>
  );
};
