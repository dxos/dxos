//
// Copyright 2022 DXOS.org
//

import { Box, Text } from 'ink';
import React from 'react';

import { truncateKey } from '@dxos/debug';
import { useProfile } from '@dxos/react-client';

export const Profile = () => {
  const profile = useProfile();
  if (!profile) {
    return null;
  }

  return (
    <Box flexDirection='column' borderStyle='single' borderColor='#333'>
      <Text color='blue'>HALO Profile</Text>
      <Box>
        <Text color='blue'>  Public Key: </Text>
        <Text>{truncateKey(profile.publicKey, 8)}</Text>
      </Box>
      <Box>
        <Text color='blue'>  Username: </Text>
        <Text>{profile.username}</Text>
      </Box>
    </Box>
  );
};
