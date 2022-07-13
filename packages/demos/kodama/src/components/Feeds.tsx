//
// Copyright 2022 DXOS.org
//

import { Box, Text } from 'ink';
import React, { FC } from 'react';

import { PublicKey } from '@dxos/crypto';
import { truncateKey } from '@dxos/debug';
import { useDevtools, useStream } from '@dxos/react-client';

export const Feeds: FC<{
  partyKey: PublicKey
}> = ({
  partyKey
}) => {
  const devtoolsHost = useDevtools();
  const { feeds = [] } = useStream(() => devtoolsHost.subscribeToFeeds({ partyKey }), {});

  return (
    <Box flexDirection='column'>
      <Text color='green'>Feeds</Text>
       {feeds?.map(({ feedKey, length }) => (
        <Box key={feedKey!.toHex()}>
          <Text>- {truncateKey(feedKey!, 8)}</Text>
          <Text> [{length}]</Text>
        </Box>
       ))}
    </Box>
  );
};
