//
// Copyright 2022 DXOS.org
//

import React from 'react';
import { Box } from '@mui/material';

import { truncateString } from '@dxos/debug';
import { Item } from '@dxos/echo-db';
import { ObjectModel } from '@dxos/object-model';

import { styles } from './styles';

export interface EchoTableProps {
  items?: Item<ObjectModel>[]
  labelProperty?: string
}

export const EchoTable = ({
  items = [],
  labelProperty = 'title'
}: EchoTableProps) => {
  return (
    <Box
      className={styles}
      sx={{
        display: 'flex',
        flex: 1,
        overflow: 'hidden'
      }}
    >
      <div style={{
        overflow: 'scroll'
      }}>
        <table>
          <tbody>
            {items.map((item) => (
              <tr key={item.id}>
                <td>
                  {truncateString(item.id, 4)}
                </td>
                <td className={item.type!.replace(/\W/g, '_')}>
                  {item.type}
                </td>
                <td>
                  {item.model.getProperty(labelProperty)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Box>
  );
};
