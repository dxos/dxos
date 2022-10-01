//
// Copyright 2020 DXOS.org
//

import ColorHash from 'color-hash';
import React, { useState } from 'react';

import { ChevronRight as ExpandIcon } from '@mui/icons-material';
import {
  IconButton,
  Link,
  TableBody,
  TableHead,
  TableRow,
  colors,
  useTheme
} from '@mui/material';

import { IFeedGenericBlock } from '@dxos/feed-store';
import { JsonTreeView } from '@dxos/react-components';

import { Table, TableCell } from '../Table';

const colorHash = new ColorHash({ saturation: 0.5 });

const color = (type: string) => type === 'halo' ? colors.red[500] : colors.blue[500];

// TODO(burdon): Remove.
const defaultGetType = (message: any) => {
  if (!message) {
    return;
  }

  if (message.echo) {
    if (message.echo.genesis) {
      return 'echo.genesis';
    } else if (message.echo.itemMutation) {
      return 'echo.itemMutation';
    } else if (message.echo.mutation) {
      return 'echo.mutation';
    }
  }

  if (message.halo) {
    // TODO(burdon): Change namespace to dxos.halo.credentials?
    if (message.halo.payload?.['@type'] === 'dxos.halo.signed.SignedMessage') {
      return message.halo.payload.signed?.payload?.__type_url ?? 'dxos.halo.signed.SignedMessage';
    } else {
      return message.halo.payload?.__type_url ?? 'halo.payload';
    }
  }
};

export interface MessageTableProps {
  messages: IFeedGenericBlock<any>[]
  getType?: (message: any) => string
  onSelect?: (data: any) => {}
}

/**
 * Hypercore message table.
 */
export const MessageTable = ({
  messages,
  getType = defaultGetType,
  onSelect
}: MessageTableProps) => {
  const theme = useTheme();

  // Dynamically expand for performance.
  const [expanded, setExpanded] = useState<{[index: string]: any}>({});
  const handleExpand = (rowKey: string) => {
    setExpanded({ ...expanded, ...{ [rowKey]: true } });
  };

  return (
    <Table
      stickyHeader
      size='small'
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
            const key = feedKey.toString();
            const rowKey = `key-${key}-${seq}`;
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
                  monospace
                  style={{ color: colorHash.hex(key) }}
                  title={key}
                >
                  {feedKey.truncate(8)}
                </TableCell>

                {/* Number. */}
                <TableCell monospace>
                  {seq}
                </TableCell>

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
                  {expanded[rowKey] ? (
                    <JsonTreeView
                      size='small'
                      depth={2}
                      data={{ data }}
                    />
                  ) : ( // TODO(burdon): Factor out.
                    <IconButton
                      size='small'
                      onClick={() => handleExpand(rowKey)}
                      sx={{
                        'marginLeft': '5px',
                        'width': 21,
                        'height': 21,
                        '& svg': {
                          width: 18,
                          height: 18
                        }
                      }}
                    >
                      <ExpandIcon />
                    </IconButton>
                  )}
                </TableCell>
              </TableRow>
            );
          })
        }
      </TableBody>
    </Table>
  );
};
