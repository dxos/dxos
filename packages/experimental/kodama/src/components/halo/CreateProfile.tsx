//
// Copyright 2022 DXOS.org
//

import { Box, Text } from 'ink';
import React, { FC, useState } from 'react';

import { generateSeedPhrase, Profile } from '@dxos/client';
import { useClient } from '@dxos/react-client';

import { TextInput } from '../../components';
import { copyToClipboard } from '../../util';
import { Panel } from '../util';

export const CreateProfile: FC<{
  onCreate: (profile: Profile) => void;
}> = ({ onCreate }) => {
  const client = useClient();
  const [username, setUsername] = useState<string>();
  const [focused, setFocused] = useState(false);
  const [clipped, setClipped] = useState(false);

  const handleSubmit = async (text: string) => {
    const username = text.trim();
    if (username.length) {
      const seedphrase = generateSeedPhrase();
      const profile = await client.halo.createProfile({ seedphrase, username });
      const clipped = await copyToClipboard(seedphrase);
      setClipped(clipped);
      onCreate(profile);
    }
  };

  return (
    <Panel highlight={focused}>
      <TextInput
        value={username ?? ''}
        onChange={setUsername}
        onSubmit={handleSubmit}
        onFocus={setFocused}
        placeholder='Enter username.'
      />

      {clipped && (
        <Box marginTop={1}>
          <Text color='gray'>Recovery phrase copied to clipboard.</Text>
        </Box>
      )}
    </Panel>
  );
};
