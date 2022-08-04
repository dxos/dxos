//
// Copyright 2022 DXOS.org
//

import copypaste from 'copy-paste';
import { Box, Text } from 'ink';
import React, { FC, useState } from 'react';

import { InvitationRequest } from '@dxos/client';
import { useAsyncEffect, useMounted } from '@dxos/react-async';

export const Share: FC<{
  onCreate: () => Promise<InvitationRequest>
}> = ({
  onCreate
}) => {
  const isMounted = useMounted();
  const [invitation, setInvitation] = useState<InvitationRequest>();
  const [status, setStatus] = useState<string>();

  useAsyncEffect(async () => {
    const invitation = await onCreate();
    // const invitation = await party.createInvitation();
    // const invitation = await client.halo.createInvitation();
    setInvitation(invitation);
    copypaste.copy(invitation.descriptor.encode());

    const handleDone = () => {
      if (isMounted()) {
        setInvitation(undefined);
        setStatus('Success');
      }
    };

    // TODO(burdon): Change API: single status event.
    invitation.canceled.on(handleDone);
    invitation.finished.on(handleDone); // TODO(burdon): Called even when fails.
    invitation.error.on(err => setStatus(`Error: ${err}`));
  }, []);

  return (
    <Box flexDirection='column'>
      {invitation && (
        <Box flexDirection='column'>
          <Box flexDirection='column'>
            <Text color='green'>Invitation (copied to clipboard)</Text>
            <Text>{invitation.descriptor.encode()}</Text>
          </Box>
          <Box flexDirection='column' marginTop={1}>
            <Text color='red'>Verification code</Text>
            <Text>{String(invitation.secret)}</Text>
          </Box>
        </Box>
      )}

      {status && (
        <Text>{status}</Text>
      )}
    </Box>
  );
};
