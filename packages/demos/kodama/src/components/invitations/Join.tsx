//
// Copyright 2022 DXOS.org
//

import { Box, Text } from 'ink';
import React, { FC, useState } from 'react';

import { InvitationDescriptor, PartyInvitation, PartyKey } from '@dxos/client';
import { useClient } from '@dxos/react-client';

import { Status, StatusState, TextInput } from '../../components';
import { Panel } from '../util';

export const Join: FC<{
  onJoin?: (partyKey?: PartyKey) => void
}> = ({
  onJoin
}) => {
  const client = useClient();
  const [focused, setFocused] = useState(false);
  const [descriptor, setDescriptor] = useState<string>();
  const [secret, setSecret] = useState<string>();
  const [invitation, setInvitation] = useState<PartyInvitation>();
  const [status, setStatus] = useState<StatusState>();

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
        setStatus({ error: err as Error });
      }
    }
  };

  const handleSubmit = async (invitation: PartyInvitation, secret: string) => {
    try {
      setStatus({});
      // TODO(burdon): Exception not caught.
      invitation!.authenticate(Buffer.from(secret));
      const party = await invitation!.getParty();
      setStatus({ success: 'OK' });
      onJoin?.(party.key);
    } catch (err) {
      setStatus({ error: err as Error });
    }
  };

  return (
    <Panel highlight={focused}>
      {!invitation && !status?.processing && (
        <TextInput
          placeholder='Enter invitation code.'
          value={descriptor ?? ''}
          onChange={setDescriptor}
          onSubmit={handleDecode}
          onFocus={setFocused}
        />
      )}

      {invitation && !status?.processing && (
        <TextInput
          placeholder='Enter verification code.'
          value={secret ?? ''}
          onChange={setSecret}
          onSubmit={() => handleSubmit(invitation!, secret!)}
          onFocus={setFocused}
        />
      )}

      <Box marginTop={1}>
        <Text>Authenticate your device.</Text>
      </Box>

      <Status
        status={status}
        marginTop={1}
      />
    </Panel>
  );
};
