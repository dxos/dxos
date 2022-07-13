//
// Copyright 2022 DXOS.org
//

import { Box, Text } from 'ink';
import React, { FC } from 'react';

import { Party } from '@dxos/client';
import { truncateKey } from '@dxos/debug';
import { useMembers } from '@dxos/react-client';

export const PartyMembers: FC<{ party: Party }> = ({ party }) => {
  const members = useMembers(party);

  return (
    <Box flexDirection='column'>
      <Text color='blue'>Members:</Text>
      {members.map(member => (
        <Box key={member.publicKey.toHex()}>
          <Text>- {truncateKey(member.publicKey, 8)} </Text>
          <Text color='blue'>({member.displayName})</Text>
        </Box>
      ))}
    </Box>
  );
};
