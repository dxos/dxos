//
// Copyright 2022 DXOS.org
//

import { Box, Text } from 'ink';
import React, { FC } from 'react';

// TODO(burdon): Truncate.
const pad = (value: any, width?: number) => String(value ?? '').padEnd(width ?? 20);

type Column = {
  key: string
  color?: string
  width?: number
  value?: (value: any) => string
  label?: string
}

/**
 * Simple table.
 */
export const Table: FC<{
  columns: Column[]
  rows: any[]
  showHeader?: boolean
}> = ({
  columns = [],
  rows = [],
  showHeader
}) => {
  return (
    <Box flexDirection='column'>
      {showHeader && (
        <Box>
          {columns.map(({ key, label, width }) => (
            <Text
              key={key}
              color='blue'
            >
              {pad(label ?? key, width)}
            </Text>
          ))}
        </Box>
      )}

      {rows.map((row, i) => (
        <Box key={i}>
          {columns.map(({ key, color, width, value }) => (
            <Text
              key={key}
              color={color}
            >
              {pad(value ? value(row[key]) : row[key], width)}
            </Text>
          ))}
        </Box>
      ))}
    </Box>
  );
};
