//
// Copyright 2022 DXOS.org
//

import { Box, Text, useFocus, useInput } from 'ink';
import React, { FC, useState } from 'react';

import { Party } from '@dxos/client';

export const PartyInvitation: FC<{
  party: Party,
  onStateChanged: (pending: boolean) => void
}> = ({
  party,
  onStateChanged
}) => {
  const { isFocused } = useFocus();
  const [invitation, setInvitation] = useState<{ descriptor: string, secret: string }>();

  useInput(async (input, key) => {
    if (isFocused && key.return) {
      const invitation = await party.createInvitation();
      onStateChanged(true);
      setInvitation({
        descriptor: invitation.descriptor.encode(),
        secret: invitation.secret.toString()
      })

      // TODO(burdon): Timeout.
      // TODO(burdon): Change API: single status event.
      const handleDone = () => {
        setInvitation(undefined);
        onStateChanged(false);
      }
      invitation.canceled.on(handleDone);
      invitation.finished.on(handleDone);
      invitation.error.on(handleDone);
    }
  });

  return (
    <Box flexDirection='column'>
      {!invitation && (
        <Box>
          <Text color='green'>{isFocused ? '> ' : '  '}</Text>
          <Text>Share</Text>
        </Box>
      )}

      {invitation && (
        <>
          <Box flexDirection='column' marginTop={1}>
            <Text color='green'>Invitation</Text>
            <Text>{invitation.descriptor}</Text>
          </Box>
          <Box flexDirection='column' marginTop={1}>
            <Text color='red'>Code</Text>
            <Text>{invitation.secret}</Text>
          </Box>
        </>
      )}
    </Box>
  );
}
