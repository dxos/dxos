//
// Copyright 2021 DXOS.org
//

import React, { useEffect, useState } from 'react';

import { Box, Button, Toolbar } from '@mui/material';

import { ConfigProto } from '@dxos/config';
import { PublicKey } from '@dxos/keys';
import {
  ClientProvider,
  useClient,
  useParties,
  BotFactoryClientProvider
} from '@dxos/react-client';
import { ProfileInitializer } from '@dxos/react-client-testing';
import { CopyText, FullScreen } from '@dxos/react-components';
import { RegistryProvider } from '@dxos/react-registry-client';

import { ErrorBoundary, PartySharingDialog } from '../src';

export default {
  title: 'react-toolkit/BotSharing'
};

const Parties = () => {
  const parties = useParties();

  return (
    <Box>
      {parties.map((party) => (
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
        modal={true}
      />

      <Box sx={{ marginTop: 2, padding: 1 }}>
        <Parties />
      </Box>
    </Box>
  );
};

/**
 * Test bot.
 * https://github.com/dxos/dxos/tree/main/packages/bot
 */
export const Primary = () => {
  const config: ConfigProto = {
    runtime: {
      client: {
        debug: 'dxos:bot*'
      },
      services: {
        // Must match values from current CLI config (`dx profile config`).
        dxns: {
          server: 'wss://node1.devnet.dxos.network/dxns/ws'
        },
        signal: {
          server: 'wss://demo.kube.dxos.network/dxos/signal'
        },
        // TODO(burdon): In-memory simulator? `dx bot factory start`
        bot: {
          topic:
            '3084b2359ef10a8b578706c9748ad41a05ac75ce992ea3b0686448e452749ce3'
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
                <Box sx={{ margin: 2, width: 600 }}>
                  <Sender />
                </Box>
              </ProfileInitializer>
            </BotFactoryClientProvider>
          </ClientProvider>
        </RegistryProvider>
      </ErrorBoundary>
    </FullScreen>
  );
};
