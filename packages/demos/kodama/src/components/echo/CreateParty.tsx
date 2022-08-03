//
// Copyright 2022 DXOS.org
//

import { Box, useFocus } from 'ink';
import TextInput from 'ink-text-input';
import React, { FC, useState } from 'react';

import { PublicKey } from '@dxos/protocols';
import { useClient } from '@dxos/react-client';

import { useAppState } from '../../hooks';
import { Panel } from '../util';

export const CreateParty: FC<{
  onCreate: (partyKey: PublicKey) => void
}> = ({
  onCreate
}) => {
  const client = useClient();
  const { isFocused } = useFocus();
  const [name, setName] = useState<string>();
  const [, { setPartyKey }] = useAppState(); // TODO(burdon): Move outside.

  const handleSubmit = async (text: string) => {
    const name = text.trim();
    if (name.length) {
      const party = await client.echo.createParty();
      void party.setProperty('title', name);
      setPartyKey(party.key);
      setName('');
      onCreate?.(party.key);
    }
  };

  return (
    <Panel focused={isFocused}>
      <Box flexDirection='column'>
        <TextInput
          value={name ?? ''}
          onChange={setName}
          onSubmit={handleSubmit}
          placeholder='Enter party name'
        />
      </Box>
    </Panel>
  );
};
