//
// Copyright 2021 DXOS.org
//

import React, { useEffect, useState } from 'react';

import { Box, Button, Toolbar } from '@mui/material';

import { Config } from '@dxos/config';
import { PublicKey } from '@dxos/keys';
import { ClientProvider, useClient, useSpaces } from '@dxos/react-client';
import { ProfileInitializer } from '@dxos/react-client-testing';
import { CopyText, FullScreen } from '@dxos/react-components';
import { RegistryProvider } from '@dxos/react-registry-client';

import { ErrorBoundary, SpaceSharingDialog } from '../src';

export default {
  title: 'react-toolkit/BotSharing'
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

      <SpaceSharingDialog open={open} spaceKey={spaceKey} onClose={() => setOpen(false)} modal={true} />

      <Box sx={{ marginTop: 2, padding: 1 }}>
        <Spaces />
      </Box>
    </Box>
  );
};

/**
 * Test bot.
 * https://github.com/dxos/dxos/tree/main/packages/bot
 */
export const Primary = () => {
  const config = new Config({
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
          topic: '3084b2359ef10a8b578706c9748ad41a05ac75ce992ea3b0686448e452749ce3'
        }
      }
    }
  });

  return (
    <FullScreen>
      <ErrorBoundary>
        <RegistryProvider config={config}>
          <ClientProvider config={config}>
            {/* <BotFactoryClientProvider> */}
            <ProfileInitializer>
              <Box sx={{ margin: 2, width: 600 }}>
                <Sender />
              </Box>
            </ProfileInitializer>
            {/* </BotFactoryClientProvider> */}
          </ClientProvider>
        </RegistryProvider>
      </ErrorBoundary>
    </FullScreen>
  );
};
