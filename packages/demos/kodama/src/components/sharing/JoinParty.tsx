//
// Copyright 2022 DXOS.org
//

import { Box, Text } from 'ink';
import Spinner from 'ink-spinner';
import TextInput from 'ink-text-input';
import React, { FC, useState } from 'react';

import { InvitationDescriptor, PartyInvitation, PartyKey } from '@dxos/client';
import { useClient } from '@dxos/react-client';

export const JoinParty: FC<{
  onJoin?: (partyKey?: PartyKey) => void
}> = ({
  onJoin
}) => {
  const client = useClient();
  const [descriptor, setDescriptor] = useState<string>();
  const [secret, setSecret] = useState<string>();
  const [processing, setProcessing] = useState(false);
  const [invitation, setInvitation] = useState<PartyInvitation>();

  const handleDecode = () => {
    try {
      // Detect if JSON.
      // TODO(burdon): Detect URL.
      // TODO(burdon): Define JSON type.
      const { encodedInvitation, secret } = JSON.parse(descriptor!);
      const invitation = client.echo.acceptInvitation(InvitationDescriptor.decode(encodedInvitation));
      void handleSubmit(invitation, secret);
    } catch (err) {
      try {
        const stripped = descriptor!.replace(/[\W]/g, '');
        const invitation = client.echo.acceptInvitation(InvitationDescriptor.decode(stripped));
        setInvitation(invitation);
      } catch (err) {
        onJoin?.();
        // setDescriptor(undefined);
      }
    }
  };

  const handleSubmit = async (invitation: PartyInvitation, secret: string) => {
    try {
      // TODO(burdon): Exception not caught.
      invitation!.authenticate(Buffer.from(secret));
      setProcessing(true);
      const party = await invitation!.getParty();
      onJoin?.(party.key);
    } catch (err) {
      onJoin?.();
    }
  };

  return (
    <Box flexDirection='column'>
      {!invitation && !processing && (
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
          onSubmit={() => handleSubmit(invitation!, secret!)}
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
};
