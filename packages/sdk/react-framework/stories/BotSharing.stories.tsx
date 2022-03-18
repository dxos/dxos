//
// Copyright 2021 DXOS.org
//

import React, { useEffect, useMemo, useState } from 'react';

import { Box, Button, Toolbar } from '@mui/material';

import { PublicKey } from '@dxos/crypto';
import { ConfigObject } from '@dxos/config';
import {
  ClientProvider,
  ProfileInitializer,
  useClient,
  useParties
} from '@dxos/react-client';
import { BotFactoryClientProvider } from '@dxos/react-client';
import { CopyText, FullScreen } from '@dxos/react-components';
import { RegistryProvider } from '@dxos/react-registry-client';
import { IRegistryClient } from '@dxos/registry-client';

import { ErrorBoundary, PartySharingDialog } from '../src';
import { Column, createMockRegistryWithBots } from './helpers';

export default {
  title: 'react-framework/BotSharing'
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

      <PartySharingDialog
        open={open}
        partyKey={partyKey}
        onClose={() => setOpen(false)}
        modal={false}
      />

      <Box sx={{ marginTop: 2, padding: 1 }}>
        <Parties />
      </Box>
    </Box>
  );
};

/**
 * Test bot.
 * https://github.com/dxos/protocols/tree/main/packages/bot
 */
export const Primary = () => {
  const mockRegistry = useMemo<IRegistryClient>(createMockRegistryWithBots, []);
  const config: ConfigObject = {
    runtime: {
      client: {
        debug: 'dxos:bot-factory-client'
      },
      services: {
        // TODO(burdon): Is the signal server required?
        // `npx @dxos/signal`
        // `dx signal install`
        // `dx signal start`
        signal: {
          server: 'ws://localhost:4000'
        },
        // TODO(burdon): In-memory simulator? `dx bot factory start`
        bot: {
          topic: 'f476b52ee394ab85233842661795999f4b3a3f45f6bbc6bf2cde67b38965681b'
        }
      }
    }
  };

  return (
    <FullScreen>
      <ErrorBoundary>
        <RegistryProvider registry={mockRegistry}>
          <ClientProvider config={config}>
            <BotFactoryClientProvider>
              <ProfileInitializer>
                <Column>
                  <Sender />
                </Column>
              </ProfileInitializer>
            </BotFactoryClientProvider>
          </ClientProvider>
        </RegistryProvider>
      </ErrorBoundary>
    </FullScreen>
  );
};
