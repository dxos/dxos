//
// Copyright 2022 DXOS.org
//

import { Box, Text, useInput } from 'ink';
import Spinner from 'ink-spinner';
import TextInput from 'ink-text-input';
import React, { FC, useState } from 'react';

import { InvitationDescriptor, PartyInvitation, PartyKey } from '@dxos/client';
import { useClient } from '@dxos/react-client';

export const JoinParty: FC<{
  onExit: (partyKey?: PartyKey) => void
}> = ({
  onExit
}) => {
  const client = useClient();
  const [descriptor, setDescriptor] = useState<string>();
  const [secret, setSecret] = useState<string>();
  const [processing, setProcessing] = useState(false);
  const [invitation, setInvitation] = useState<PartyInvitation>();

  const handleDecode = () => {
    const stripped = descriptor!.replace(/[\W]/g, '');
    const invitation = client.echo.acceptInvitation(InvitationDescriptor.decode(stripped));
    setInvitation(invitation);
  }

  const handleSubmit = async () => {
    if (secret) {
      invitation!.authenticate(Buffer.from(secret));
      setProcessing(true);

      try {
        const party = await invitation!.getParty();
        onExit(party.key);
      } catch (err) {
        onExit();
      }
    }
  };

  useInput((input, key) => {
    if (key.escape) {
      onExit();
    }
  });

  return (
    <Box flexDirection='column' borderStyle='single' borderColor='#333'>
      {!invitation && (
        <TextInput
          placeholder='Enter invitation'
          value={descriptor ?? ''}
          onChange={setDescriptor}
          onSubmit={handleDecode}
        />
      )}

      {invitation && !processing && (
        <TextInput
          placeholder='Enter code'
          value={secret ?? ''}
          onChange={setSecret}
          onSubmit={handleSubmit}
        />
      )}

      {processing && (
        <Text>
          <Text color='green'>
            <Spinner type='dots' />
          </Text>
          {' Authenticating'}
        </Text>
      )}
    </Box>
  );
}
