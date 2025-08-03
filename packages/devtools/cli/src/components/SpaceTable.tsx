//
// Copyright 2023 DXOS.org
//

import Table from 'ink-table';
import React, { type FC, useEffect, useState } from 'react';

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

  const handleRefresh = async () => {
    const spaces = client.spaces.get();
    const data = await mapSpaces(spaces, { truncateKeys: true });
    setData(
      data.map(({ key, state, name, members, objects, startup }) => ({
        key,
        state,
        name,
        members,
        objects,
        startup,
      })),
    );
  };

  if (!data.length) {
    return null;
  }

  return <Table data={data} />;
};
