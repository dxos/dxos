//
// Copyright 2022 DXOS.org
//

import format from 'date-format';
import { Box } from 'ink';
import React from 'react';

import { truncateKey } from '@dxos/debug';
import { useDevtools, useStream } from '@dxos/react-client';

import { Table } from '../util';

const formatDate = (date: Date) => format('yyyy-mm-dd hh:mm:ss', new Date(date));

export const Keychain = () => {
  const devtoolsHost = useDevtools();
  const { keys } = useStream(() => devtoolsHost.subscribeToKeyringKeys({}), {});
  if (keys === undefined) {
    return null;
  }

  return (
    <Box flexDirection='column'>
      <Table
        showHeader
        columns={[
          {
            key: 'type',
            width: 8
          },
          {
            key: 'own',
            width: 8
          },
          {
            key: 'trusted',
            width: 8
          },
          {
            key: 'created',
            width: 20,
            value: date => formatDate(date)
          },
          {
            key: 'added',
            width: 20,
            value: date => formatDate(date)
          },
          {
            key: 'publicKey',
            width: 20,
            value: key => truncateKey(key, 8)
          }
        ]}
        rows={keys}
      />
    </Box>
  );
};
