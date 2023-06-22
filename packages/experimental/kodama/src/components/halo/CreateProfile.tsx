//
// Copyright 2022 DXOS.org
//

import { Box, Text } from 'ink';
import React, { FC, useState } from 'react';

import { generateSeedPhrase, Identity } from '@dxos/client';
import { useClient } from '@dxos/react-client';

import { TextInput } from '..';
import { copyToClipboard } from '../../util';
import { Panel } from '../util';

export const CreateProfile: FC<{
  onCreate: (identity: Identity) => void;
}> = ({ onCreate }) => {
  const client = useClient();
  const [displayName, setDisplayName] = useState<string>();
  const [focused, setFocused] = useState(false);
  const [clipped, setClipped] = useState(false);

  const handleSubmit = async (text: string) => {
    const displayName = text.trim();
    if (displayName.length) {
      // TODO(dmaretskyi): Remove seedphrase.
      const seedphrase = generateSeedPhrase();
      const identity = await client.halo.createIdentity({ displayName });
      const clipped = await copyToClipboard(seedphrase);
      setClipped(clipped);
      onCreate(identity);
    }
  };

  return (
    <Panel highlight={focused}>
      <TextInput
        value={displayName ?? ''}
        onChange={setDisplayName}
        onSubmit={handleSubmit}
        onFocus={setFocused}
        placeholder='Enter a display name.'
      />

      {clipped && (
        <Box marginTop={1}>
          <Text color='gray'>Recovery phrase copied to clipboard.</Text>
        </Box>
      )}
    </Panel>
  );
};
