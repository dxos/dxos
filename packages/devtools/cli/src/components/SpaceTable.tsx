//
// Copyright 2023 DXOS.org
//

import Table from 'ink-table';
import React, { useEffect, type FC, useState } from 'react';

import { mapSpaces } from '@dxos/cli-base';
import { type Client } from '@dxos/client';

/**
 * Spaces list table.
 */
export const SpaceTable: FC<{ client: Client; interval?: number }> = ({ client, interval = 1000 }) => {
  const [data, setData] = useState<{ key: string }[]>([]);
  useEffect(() => {
    const timer = setInterval(() => handleRefresh(), Math.min(100, interval));
    return () => clearInterval(timer);
  }, [client, interval]);

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

  if (!data.length) {
    return null;
  }

  return <Table data={data} />;
};
