//
// Copyright 2021 DXOS.org
//

import React, { useEffect, useState } from 'react';

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

import { ErrorBoundary, PartySharingDialog } from '../src';
import { Column } from './helpers';

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
  const config: ConfigObject = {
    runtime: {
      client: {
        debug: 'dxos:bot-factory-client'
      },
      services: {
        dxns: {
          server: 'wss://dxns1.kube.dxos.network/dxns/ws'
        },
        // TODO(burdon): Configure CLI (`dx bot factory start --dev`).
        signal: {
          server: 'wss://enterprise.kube.dxos.network/dxos/signal'
        },
        // TODO(burdon): In-memory simulator? `dx bot factory start`
        bot: {
          topic: '3bcdff506034e818e3ad20df52faa5955dcb862e6e01c3001b4925d3d23bd433'
        }
      }
    }
  };

  return (
    <FullScreen>
      <ErrorBoundary>
        <RegistryProvider config={config}>
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
