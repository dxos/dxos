//
// Copyright 2023 DXOS.org
//

import { Box, Text, useApp, useInput } from 'ink';
import Table from 'ink-table';
import React, { useEffect, FC, useState } from 'react';

import { Client } from '@dxos/client';

import { mapSpaces } from '../util';

/**
 * Spaces list table.
 */
export const SpaceTable: FC<{ client: Client; period?: number }> = ({ client, period = 1000 }) => {
  const { exit } = useApp();
  useInput((input) => {
    if (input === 'q') {
      exit();
    }
  });

  const [data, setData] = useState<{ key: string }[]>([]);
  useEffect(() => {
    const timer = setInterval(() => {
      const spaces = client.spaces.get();
      const data = mapSpaces(spaces, { truncateKeys: true });
      setData(
        data.map(({ key, open, objects }) => ({
          key,
          open,
          objects,
        })),
      );
    }, period);

    return () => clearInterval(timer);
  }, [client]);

  // https://github.com/vadimdemedes/ink
  return (
    <Box flexDirection='column'>
      <Text>[q] to quit</Text>
      {data.length > 0 && <Table data={data} />}
    </Box>
  );
};
