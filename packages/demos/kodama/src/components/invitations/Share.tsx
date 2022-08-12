//
// Copyright 2022 DXOS.org
//

import { Box, Text } from 'ink';
import React, { FC, useState } from 'react';

import { InvitationRequest } from '@dxos/client';
import { useAsyncEffect, useMounted } from '@dxos/react-async';

import { copyToClipboard } from '../../util';
import { ActionStatus, StatusState } from '../util';

export const Share: FC<{
  onCreate: () => Promise<InvitationRequest>
}> = ({
  onCreate
}) => {
  const isMounted = useMounted();
  const [invitation, setInvitation] = useState<InvitationRequest>();
  const [status, setStatus] = useState<StatusState>();
  const [clipped, setClipped] = useState(false);

  useAsyncEffect(async () => {
    // TODO(burdon): Set timeout to process invitation? Separate method to start?
    const invitation = await onCreate();
    setInvitation(invitation);
    const clipped = await copyToClipboard(invitation.descriptor.encode());
    setClipped(clipped);

    const handleDone = () => {
      if (isMounted()) {
        setStatus({ success: 'OK' });
      }
    };

    // TODO(burdon): Change API: single status event.
    invitation.canceled.on(handleDone);
    invitation.finished.on(handleDone); // TODO(burdon): Called even when fails.
    invitation.error.on(err => setStatus({ error: err as Error }));
  }, []);

  return (
    <Box flexDirection='column'>
      {invitation && (
        <Box flexDirection='column'>
          <Box flexDirection='column'>
            <Text color='green'>Invitation
              {clipped && (
                <Text> (copied to clipboard)</Text>
              )}
              </Text>
            <Text>{invitation.descriptor.encode()}</Text>
          </Box>
          <Box flexDirection='column' marginTop={1}>
            <Text color='red'>Verification code</Text>
            <Text>{String(invitation.secret)}</Text>
          </Box>
        </Box>
      )}

      <ActionStatus
        status={status}
        marginTop={1}
      />
    </Box>
  );
};
