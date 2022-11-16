//
// Copyright 2021 DXOS.org
//

import React, { useEffect, useState } from 'react';

import { Box, Button, Toolbar } from '@mui/material';

import { PublicKey } from '@dxos/keys';
import { useAsyncEffect } from '@dxos/react-async';
import { ClientProvider, useClient, useSpaces } from '@dxos/react-client';
import { ProfileInitializer } from '@dxos/react-client-testing';
import { CopyText, FullScreen, Passcode } from '@dxos/react-components';
import { RegistryProvider } from '@dxos/react-registry-client';
import { RegistryClient } from '@dxos/registry-client';

import { ErrorBoundary, JoinSpaceDialog, SpaceSharingDialog } from '../src';
import { Column, createMockRegistryWithBot } from './helpers';

export default {
  title: 'react-toolkit/SpaceSharing'
};

const Spaces = () => {
  const spaces = useSpaces();

  return (
    <Box>
      {spaces.map((space) => (
        <Box key={space.key.toHex()}>
          <CopyText value={space.key.toHex()} />
        </Box>
      ))}
    </Box>
  );
};

const Sender = () => {
  const [open, setOpen] = useState(true);
  const [spaceKey, setSpaceKey] = useState<PublicKey>();
  const client = useClient();

  const handleCreateSpace = async () => {
    const space = await client.echo.createSpace();
    setSpaceKey(space.key);
  };

  useEffect(() => {
    void handleCreateSpace();
  }, []);

  if (!spaceKey) {
    return null;
  }

  return (
    <Box>
      <Toolbar>
        <Button onClick={() => setOpen(true)}>Open</Button>
        <Button onClick={handleCreateSpace}>Create Space</Button>
      </Toolbar>

      <SpaceSharingDialog open={open} spaceKey={spaceKey} onClose={() => setOpen(false)} modal={false} />

      <Box sx={{ marginTop: 2, padding: 1 }}>
        <Spaces />
      </Box>
    </Box>
  );
};

const Receiver = ({ invitationCode }: { invitationCode?: string }) => {
  const [open, setOpen] = useState(true);

  return (
    <Box>
      <Toolbar>
        <Button onClick={() => setOpen(true)}>Open</Button>
      </Toolbar>

      <JoinSpaceDialog
        open={open}
        invitationCode={invitationCode}
        onJoin={(space) => console.log(`Joined space: ${space.key.toHex()}`)}
        onClose={() => setOpen(false)}
        closeOnSuccess={true}
        modal={false}
      />

      <Box sx={{ marginTop: 2, padding: 1 }}>
        <Spaces />
      </Box>
    </Box>
  );
};

export const Primary = () => {
  const [mockRegistry, setMockRegistry] = useState<RegistryClient>();

  useAsyncEffect(async () => {
    const registry = await createMockRegistryWithBot();
    setMockRegistry(registry);
  }, []);

  if (!mockRegistry) {
    return null;
  }

  return (
    <FullScreen>
      <ErrorBoundary>
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'space-around'
          }}
        >
          <ClientProvider>
            <RegistryProvider registry={mockRegistry}>
              <ProfileInitializer>
                <Column>
                  <Sender />
                </Column>
              </ProfileInitializer>
            </RegistryProvider>
          </ClientProvider>

          <ClientProvider>
            <ProfileInitializer>
              <Column>
                <Receiver />
              </Column>
            </ProfileInitializer>
          </ClientProvider>
        </Box>
      </ErrorBoundary>
    </FullScreen>
  );
};

/**
 * Headless sender.
 */
const AutoInvitationGenerator = ({ onInvite }: { onInvite: (invitationCode: string) => void }) => {
  const client = useClient();
  const [authenticationCode, _setAuthenticationCode] = useState('');

  useEffect(() => {
    setTimeout(async () => {
      const space = await client.echo.createSpace();
      await space.createInvitation();
      throw new Error('Not implemented.');
      // invitation.finished.on(() => setPin(''));
      // invitation.connected.on(() => setPin(invitation.secret.toString()));
      // onInvite(invitation.encode());
    });
  }, []);

  return <Box>{authenticationCode && <Passcode value={authenticationCode} />}</Box>;
};

export const Secondary = () => {
  const [invitationCode, setInvitationCode] = useState<string>();

  return (
    <FullScreen>
      <ErrorBoundary>
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'space-around'
          }}
        >
          <ClientProvider>
            <ProfileInitializer>
              <Column>
                <AutoInvitationGenerator onInvite={(invitationCode) => setInvitationCode(invitationCode)} />
              </Column>
            </ProfileInitializer>
          </ClientProvider>

          <ClientProvider>
            <ProfileInitializer>
              <Column>{invitationCode && <Receiver invitationCode={invitationCode} />}</Column>
            </ProfileInitializer>
          </ClientProvider>
        </Box>
      </ErrorBoundary>
    </FullScreen>
  );
};
