//
// Copyright 2022 DXOS.org
//

import { Box, Text, useStdout } from 'ink';
// import qrcode from 'qrcode-terminal';
import React, { FC, useState } from 'react';

import { InvitationRequest } from '@dxos/client';
import { useAsyncEffect, useMounted } from '@dxos/react-async';

import { clear, copyToClipboard } from '../../util';
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
  const { write } = useStdout();

  useAsyncEffect(async () => {
    // TODO(burdon): Set timeout to process invitation? Separate method to start?
    const invitation = await onCreate();
    setInvitation(invitation);
    let clipped = await copyToClipboard(invitation.descriptor.encode());
    clipped = false;
    setClipped(clipped);
    if (!clipped) {
      write(`Invitation (clipboard not available)\n${invitation.descriptor.encode()}\n\n`);
    }

    // TODO(burdon): Console QR code.
    // qrcode.generate(invitation.descriptor.encode(), { small: true }, (str: string) => {
    //   console.log(str);
    // });

    const handleDone = () => {
      if (isMounted()) {
        setStatus({ success: 'OK' });
      }
    };

    // TODO(burdon): Change API: single status event.
    invitation.canceled.on(handleDone);
    invitation.finished.on(handleDone); // TODO(burdon): Called even when fails.
    invitation.error.on(err => setStatus({ error: err as Error }));

    return clipped;
  }, (clipped) => {
    if (!clipped) {
      clear();
    }
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
