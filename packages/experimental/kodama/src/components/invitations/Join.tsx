//
// Copyright 2022 DXOS.org
//

import { Box } from 'ink';
import React, { FC, useState } from 'react';

import { InvitationEncoder, Invitation } from '@dxos/client';
import { PublicKey } from '@dxos/keys';
import { useClient, useSpace } from '@dxos/react-client';

import { ActionStatus, SpaceInfo, StatusState, TextInput } from '../../components';
import { Panel } from '../util';

export const Join: FC<{
  onJoin?: (spaceKey: PublicKey) => void;
}> = ({ onJoin }) => {
  const client = useClient();
  const [focused, setFocused] = useState(false);
  const [invitationCode, setInvitationCode] = useState<string>();
  const [secret, setSecret] = useState<string>();
  const [invitation, _setInvitation] = useState<Invitation>();
  const [status, setStatus] = useState<StatusState>();
  const [spaceKey, setSpaceKey] = useState<PublicKey>();
  const space = useSpace(spaceKey);

  const handleDecode = async () => {
    const invitation = InvitationEncoder.decode(invitationCode!);
    const observable = await client.echo.acceptInvitation(invitation);
    observable.subscribe({
      onSuccess: (invitation: Invitation) => {
        setSpaceKey(invitation.spaceKey);
      },
      onError: (err: Error) => {
        setStatus({ error: err as Error });
      }
    });
  };

  const handleSubmit = async (invitation: Invitation, secret: string) => {
    try {
      setStatus({ processing: 'Authenticating...' });
      // await invitation!.authenticate(Buffer.from(secret));
      // const space = await invitation!.getSpace();
      // setInvitation(undefined);
      // setStatus({ success: 'OK' });
      // setSpaceKey(space.key);
      // onJoin?.(space.key);
    } catch (err) {
      setStatus({ error: err as Error });
    }
  };

  return (
    <Panel highlight={focused}>
      {!status?.error && !status?.success && (
        <TextInput
          focus={!invitation}
          placeholder='Enter invitation code.'
          value={invitationCode ?? ''}
          onChange={setInvitationCode}
          onSubmit={handleDecode}
          onFocus={setFocused}
        />
      )}

      {invitation && !status?.processing && (
        <Box marginTop={1}>
          <TextInput
            focus={invitation && !status?.processing}
            placeholder='Enter verification code (enter 0000).'
            value={secret ?? ''}
            onChange={setSecret}
            onSubmit={() => handleSubmit(invitation!, secret!)}
            onFocus={setFocused}
          />
        </Box>
      )}

      {space && <SpaceInfo space={space} />}

      <ActionStatus status={status} marginTop={1} />
    </Panel>
  );
};
