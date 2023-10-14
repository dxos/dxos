//
// Copyright 2022 DXOS.org
//

import { Box, Text, useStdout } from 'ink';
import React, { type FC, useState } from 'react';

import { useAsyncEffect, useMounted } from '@dxos/react-async';
import { InvitationEncoder, Invitation, type CancellableInvitationObservable } from '@dxos/react-client/invitations';

import { clear, copyToClipboard } from '../../util';
import { ActionStatus, type StatusState } from '../util';

export const Share: FC<{
  onCreate: () => CancellableInvitationObservable;
}> = ({ onCreate }) => {
  const isMounted = useMounted();
  const [invitation, setInvitation] = useState<Invitation>();
  const [status, setStatus] = useState<StatusState>();
  const [clipped, setClipped] = useState(false);
  const { write } = useStdout();

  useAsyncEffect(
    async () => {
      // TODO(burdon): Set timeout to process invitation? Separate method to start?
      const observable = onCreate();
      observable.subscribe(
        async (invitation: Invitation) => {
          switch (invitation.state) {
            case Invitation.State.CONNECTING: {
              setInvitation(invitation);
              const code = InvitationEncoder.encode(invitation);
              const clipped = await copyToClipboard(code);
              setClipped(clipped);
              if (!clipped) {
                write(`Invitation (clipboard not available)\n${code}\n\n`);
              }
              break;
            }

            case Invitation.State.SUCCESS: {
              if (isMounted()) {
                setStatus({ success: 'OK' });
              }
            }
          }
        },
        (err: Error) => {
          setStatus({ error: err });
        },
      );
    },
    () => {
      clear();
    },
    [],
  );

  return (
    <Box flexDirection='column'>
      {invitation && (
        <Box flexDirection='column'>
          <Box flexDirection='column'>
            <Text color='green'>
              Invitation
              {clipped && <Text> (copied to clipboard)</Text>}
            </Text>
            <Text>{InvitationEncoder.encode(invitation)}</Text>
          </Box>
          {/*
          <Box flexDirection='column' marginTop={1}>
            <Text color='red'>Verification code</Text>
            <Text>{String(invitation.secret)}</Text>
          </Box>
          */}
        </Box>
      )}

      <ActionStatus status={status} marginTop={1} />
    </Box>
  );
};
