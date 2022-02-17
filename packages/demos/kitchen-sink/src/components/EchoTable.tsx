//
// Copyright 2022 DXOS.org
//

import React from 'react';
import { css } from '@emotion/css';

import { truncateString } from '@dxos/debug';
import { Item } from '@dxos/echo-db';
import { ObjectModel } from '@dxos/object-model';

import { Box } from '@mui/material';

const styles = css`
  table {
    td {
      font-family: monospace;
      font-size: 16px;
      padding: 2px 8px;
      color: #333;
    }
    
    // https://mui.com/customization/color/#color-palette
    td.example_type_org {
      color: #00796b;
    }
    td.example_type_project {
      color: #7b1fa2;
    }
    td.example_type_person {
      color: #e64a19;
    }
    td.example_type_task {
      color: #388e3c;
    }
  }
`;

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
        flex: 1
      }}
    >
      <table>
        <tbody>
          {items.map((item) => (
            <tr key={item.id}>
              <td>
                {truncateString(item.id, 8)}
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
    </Box>
  );
};
