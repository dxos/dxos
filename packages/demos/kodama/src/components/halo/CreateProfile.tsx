//
// Copyright 2022 DXOS.org
//

import copypaste from 'copy-paste';
import { Box, Text, useFocus } from 'ink';
import TextInput from 'ink-text-input';
import React, { useState } from 'react';

import { generateSeedPhrase } from '@dxos/client';
import { useClient } from '@dxos/react-client';

import { Panel } from '../util';

export const CreateProfile = () => {
  const client = useClient();
  const { isFocused } = useFocus();
  const [username, setUsername] = useState<string>();

  const handleSubmit = async (text: string) => {
    const username = text.trim();
    if (username.length) {
      const seedphrase = generateSeedPhrase();
      await client.halo.createProfile({ seedphrase, username });
      copypaste.copy(seedphrase);
    }
  };

  return (
    <Panel focused={isFocused}>
      <Box flexDirection='column'>
        <TextInput
          value={username ?? ''}
          onChange={setUsername}
          onSubmit={handleSubmit}
          placeholder='Enter username'
        />

        <Box marginTop={1}>
          <Text color='gray'>key phrase will be copied to the clipboard.</Text>
        </Box>
      </Box>
    </Panel>
  );
};
