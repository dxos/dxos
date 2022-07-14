//
// Copyright 2022 DXOS.org
//

import copypaste from 'copy-paste';
import { Box, Text } from 'ink';
import React, { FC, useState } from 'react';

import { Party } from '@dxos/client';
import { useAsyncEffect } from '@dxos/react-async';

export const ShareParty: FC<{
  party: Party
}> = ({
  party
}) => {
  const [invitation, setInvitation] = useState<{ descriptor: string, secret: string }>();
  const [status, setStatus] = useState<string>();

  useAsyncEffect(async () => {
    const invitation = await party.createInvitation();
    setInvitation({
      descriptor: invitation.descriptor.encode(),
      secret: invitation.secret.toString()
    });

    copypaste.copy(invitation.descriptor.encode());

    // TODO(burdon): Timeout.
    // TODO(burdon): Change API: single status event.
    const handleDone = () => {
      setInvitation(undefined);
      setStatus('Success');
    };

    invitation.canceled.on(handleDone);
    invitation.finished.on(handleDone);

    invitation.error.on(err => setStatus(`Error: ${err}`));
  }, []);

  return (
    <Box flexDirection='column'>
      {invitation && (
        <Box flexDirection='column'>
          <Box flexDirection='column'>
            <Text color='green'>Invitation (copied to clipboard)</Text>
            <Text>{invitation.descriptor}</Text>
          </Box>
          <Box flexDirection='column' marginTop={1}>
            <Text color='red'>Code</Text>
            <Text>{invitation.secret}</Text>
          </Box>
        </Box>
      )}

      {status && (
        <Text>{status}</Text>
      )}
    </Box>
  );
};
