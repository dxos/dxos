//
// Copyright 2020 DXOS.org
//

import debug from 'debug'
import leveljs from 'level-js';
import React, { useEffect, useState } from 'react';
import useResizeAware from 'react-resize-aware';

import { Button, TextField, Toolbar } from '@material-ui/core';

import { createId } from '@dxos/crypto';
import { Database, InvitationDescriptor } from '@dxos/echo-db';
import { FullScreen, SVG, useGrid } from '@dxos/gem-core';
import { Markers } from '@dxos/gem-spore';
import { createStorage } from '@dxos/random-access-multi-storage';
import { SwarmProvider } from '@dxos/network-manager'
import { Keyring } from '@dxos/credentials';

import { createDatabase, EchoContext, EchoGraph } from '../src';

const log = debug('dxos:echo:demo');
debug.enable('dxos:*');

export default {
  title: 'Demo',
  decorators: []
};

export const withSwarm = () => {
  const [id] = useState(createId());
  const [database, setDatabase] = useState<Database>();
  const [keyring, setKeyring] = useState<Keyring>();
  const [storage] = useState(() => createStorage('dxos/echo-demo'));

  useEffect(() => {
    setImmediate(async () => {
      const { database, keyring } = await createDatabase({
        storage,
        keyStorage: leveljs('dxos/echo-demo/keystore'),
        // TODO(burdon): Move const to config.
        swarmProvider: new SwarmProvider({ signal: 'wss://signal2.dxos.network/dxos/signal' })
      });

      log('Created:', String(database));
      setDatabase(database);
      setKeyring(keyring);
    });
  }, []);

  const [resizeListener, size] = useResizeAware();
  const { width, height } = size;
  const grid = useGrid({ width, height });
  const radius = Math.min(grid.size.width, grid.size.height) / 3;
  const [invitation, setInvitation] = useState(null);

  // Click to invite.
  const handleInvite = async (node) => {
    const party = await database.getParty(node.partyKey);
    const invitation = await party.createInvitation({
      secretProvider: async () => Buffer.from('0000'),
      secretValidator: async () => true,
    });

    setInvitation(JSON.stringify(invitation.toQueryParameters()));
  };

  async function handleJoin() {
    log('handleJoin', invitation);
    const party = await database.joinParty(
      InvitationDescriptor.fromQueryParameters(JSON.parse(invitation)), async () => Buffer.from('0000'));
    await party.open();
  }

  async function handleResetStorage() {
    localStorage.clear();
    await keyring.deleteAllKeyRecords();
    await storage.destroy();
    window.location.reload();
  }

  return (
    <FullScreen>
      <div style={{ display: 'flex', flex: 1, flexDirection: 'column', overflow: 'hidden' }}>
        <Toolbar>
          <TextField
            style={{ flex: 1 }}
            placeholder='Invitation code'
            inputProps={{ spellCheck: false }}
            multiline={true}
            rows={3}
            value={invitation}
            onChange={event => setInvitation((event.currentTarget as any).value)}
          />
          <div>
            <Button onClick={handleJoin}>Join</Button>
            <Button onClick={handleResetStorage}>Reset</Button>
          </div>
        </Toolbar>

        <div style={{ display: 'flex', flex: 1, position: 'relative' }}>
          {resizeListener}
          <SVG width={width} height={height}>
            <Markers />

            {database && (
              <EchoContext.Provider key={id} value={{ database }}>
                <EchoGraph
                  id={id}
                  grid={grid}
                  radius={radius}
                  onSelect={node => node.type === 'party' && handleInvite(node)}
                />
              </EchoContext.Provider>
            )}
          </SVG>
        </div>
      </div>
    </FullScreen>
  );
};
