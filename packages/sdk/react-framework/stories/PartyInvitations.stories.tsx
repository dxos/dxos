//
// Copyright 2021 DXOS.org
//

import React, { useEffect, useState } from 'react';

import { Box, Button, Toolbar } from '@mui/material';

import { PublicKey } from '@dxos/crypto';
import {
  ClientProvider,
  ProfileInitializer,
  useClient,
  useParties
} from '@dxos/react-client';
import { CopyText, FullScreen, Passcode } from '@dxos/react-components';

import { ErrorBoundary, JoinPartyDialog, PartySharingDialog } from '../src';
import { Column } from './helpers';

export default {
  title: 'react-framework/PartyInvitations'
};

const Parties = () => {
  const parties = useParties();

  return (
    <Box>
      {parties.map(party => (
        <Box key={party.key.toHex()}>
          <CopyText value={party.key.toHex()} />
        </Box>
      ))}
    </Box>
  );
};

const Sender = () => {
  const [open, setOpen] = useState(true);
  const [partyKey, setPartyKey] = useState<PublicKey>();
  const client = useClient();

  const handleCreateParty = async () => {
    const party = await client.echo.createParty();
    setPartyKey(party.key);
  };

  useEffect(() => {
    void handleCreateParty();
  }, []);

  if (!partyKey) {
    return null;
  }

  return (
    <Box>
      <Toolbar>
        <Button onClick={() => setOpen(true)}>Open</Button>
        <Button onClick={handleCreateParty}>Create Party</Button>
      </Toolbar>
      {open && (
        <PartySharingDialog
          partyKey={partyKey}
          open={open}
          onClose={() => setOpen(false)}
          modal={false}
        />
      )}
      <Box sx={{ marginTop: 2, padding: 1 }}>
        <Parties />
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
      <JoinPartyDialog
        open={open}
        invitationCode={invitationCode}
        onJoin={(party) => console.log(`Joined party: ${party.key.toHex()}`)}
        onClose={() => setOpen(false)}
        closeOnSuccess={true}
        modal={false}
      />
      <Box sx={{ marginTop: 2, padding: 1 }}>
        <Parties />
      </Box>
    </Box>
  );
};

export const Primary = () => {
  return (
    <FullScreen>
      <ErrorBoundary>
        <Box sx={{
          display: 'flex',
          justifyContent: 'space-around'
        }}>
          <ClientProvider>
            <ProfileInitializer>
              <Column>
                <Sender />
              </Column>
            </ProfileInitializer>
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

const AutoInvitationGenerator = ({
  onInvite
}: {
  onInvite: (invitationCode: string) => void
}) => {
  const client = useClient();
  const [pin, setPin] = useState('');

  useEffect(() => {
    setImmediate(async () => {
      const party = await client.echo.createParty();
      const invitation = await party.createInvitation();
      invitation.finished.on(() => setPin(''));
      invitation.connected.on(() => setPin(invitation.secret.toString()));

      onInvite(invitation.descriptor.encode());
    });
  }, []);

  return (
    <Box>
      {pin && (
        <Passcode value={pin} />
      )}
    </Box>
  );
};

export const Secondary = () => {
  const [invitationCode, setInvitationCode] = useState<string>();

  return (
    <FullScreen>
      <ErrorBoundary>
        <Box sx={{
          display: 'flex',
          justifyContent: 'space-around'
        }}>
          <ClientProvider>
            <ProfileInitializer>
              <Column>
                <AutoInvitationGenerator
                  onInvite={invitationCode => setInvitationCode(invitationCode)}
                />
              </Column>
            </ProfileInitializer>
          </ClientProvider>

          <ClientProvider>
            <ProfileInitializer>
              <Column>
                {invitationCode && (
                  <Receiver
                    invitationCode={invitationCode}
                  />
                )}
              </Column>
            </ProfileInitializer>
          </ClientProvider>
        </Box>
      </ErrorBoundary>
    </FullScreen>
  );
};
