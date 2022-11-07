//
// Copyright 2022 DXOS.org
//

import { Box, Text, useStdout } from 'ink';
import React, { FC, useState } from 'react';

import { CancellableObservable } from '@dxos/async';
import { InvitationEvents, InvitationEncoder, Invitation } from '@dxos/client';
import { useAsyncEffect, useMounted } from '@dxos/react-async';

import { clear, copyToClipboard } from '../../util';
import { ActionStatus, StatusState } from '../util';

export const Share: FC<{
  onCreate: () => CancellableObservable<InvitationEvents>;
}> = ({ onCreate }) => {
  const isMounted = useMounted();
  const [invitation, setInvitation] = useState<Invitation>();
  const [status, setStatus] = useState<StatusState>();
  const [clipped, setClipped] = useState(false);
  const { write } = useStdout();

  useAsyncEffect(
    async () => {
      // TODO(burdon): Set timeout to process invitation? Separate method to start?
      const observable = await onCreate();
      observable.subscribe({
        onConnected: async (invitation: Invitation) => {
          setInvitation(invitation);
          const code = InvitationEncoder.encode(invitation);
          const clipped = await copyToClipboard(code);
          setClipped(clipped);
          if (!clipped) {
            write(`Invitation (clipboard not available)\n${code}\n\n`);
          }
        },
        onSuccess: (invitation: Invitation) => {
          if (isMounted()) {
            setStatus({ success: 'OK' });
          }
        },
        onError: (err: Error) => {
          setStatus({ error: err });
        }
      });
    },
    () => {
      clear();
    },
    []
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
