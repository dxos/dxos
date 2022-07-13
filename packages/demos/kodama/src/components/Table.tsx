//
// Copyright 2022 DXOS.org
//

import { Box, Text } from 'ink';
import React, { FC } from 'react';

// TODO(burdon): Truncate.
const pad = (value: any, width?: number) => String(value ?? '').padEnd(width ?? 20);

export const Table: FC<{
  columns: { key: string, color?: string, width?: number }[]
  rows: any[] }
> = ({ columns = [], rows = [] }) => {
  return (
    <Box flexDirection='column'>
      {rows.map((row, i) => (
        <Box key={i}>
          {columns.map(({ key, color, width }, j) => (
            <Text
              key={j}
              color={color}
            >
              {pad(row[key], width)}
            </Text>
          ))}
        </Box>
      ))}
    </Box>
  );
};
