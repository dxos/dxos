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
export const SpaceTable: FC<{ client: Client; interval?: number }> = ({ client, interval = 1000 }) => {
  const { exit } = useApp();
  useInput((input) => {
    switch (input) {
      case 'r': {
        handleRefresh();
        break;
      }
      case 'q': {
        exit();
        break;
      }
    }
  });

  const [data, setData] = useState<{ key: string }[]>([]);
  useEffect(() => {
    const timer = setInterval(() => handleRefresh(), Math.min(100, interval));
    return () => clearInterval(timer);
  }, [client]);

  const handleRefresh = () => {
    const spaces = client.spaces.get();
    const data = mapSpaces(spaces, { truncateKeys: true });
    setData(
      data.map(({ key, open, objects }) => ({
        key,
        open,
        objects,
      })),
    );
  };

  // https://github.com/vadimdemedes/ink
  return (
    <Box flexDirection='column'>
      {data.length > 0 && <Table data={data} />}
      <Box flexDirection='column'>
        <Text> [q] to quit; [r] to refresh</Text>
      </Box>
    </Box>
  );
};
