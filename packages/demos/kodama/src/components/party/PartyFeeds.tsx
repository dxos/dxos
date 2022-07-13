//
// Copyright 2022 DXOS.org
//

import { Box, Text } from 'ink';
import React, { FC } from 'react';

import { Party } from '@dxos/client';
import { truncateKey } from '@dxos/debug';
import { useDevtools, useStream } from '@dxos/react-client';

import { Panel } from '../util';

export const PartyFeeds: FC<{
  party: Party
}> = ({
  party
}) => {
  const devtoolsHost = useDevtools();
  const { feeds = [] } = useStream(() => devtoolsHost.subscribeToFeeds({ partyKey: party.key }), {});

  return (
    <Panel>
      {feeds?.map(({ feedKey, length }) => (
        <Box key={feedKey!.toHex()}>
          <Text>- {truncateKey(feedKey!, 8)}</Text>
          <Text> [{length}]</Text>
        </Box>
      ))}
    </Panel>
  );
};
