//
// Copyright 2020 DXOS.org
//

import { createId } from '@dxos/crypto';
import { Database, InvitationDescriptor } from '@dxos/experimental-echo-db';
import { FullScreen, Grid, SVG, useGrid } from '@dxos/gem-core';
import { Markers } from '@dxos/gem-spore';
import React, { useEffect, useState } from 'react';
import useResizeAware from 'react-resize-aware';
import { EchoContext, EchoGraph } from '../src';
import { createDatabase } from '../src/database';
import { createStorage } from '@dxos/random-access-multi-storage';
import leveljs from 'level-js';
import { SwarmProvider } from '@dxos/network-manager'
import debug from 'debug'
import { Keyring } from '@dxos/credentials';

debug.enable('dxos:*');

export default {
  title: 'Demo',
  decorators: []
};

export const withPersistent = () => {
  const [id] = useState(createId())
  const [database, setDatabase] = useState<Database>()
  const [keyring, setKeyring] = useState<Keyring>()
  const [storage] = useState(() => createStorage('dxos/echo-demo'));
  useEffect(() => {
    setImmediate(async () => {
      const { database, keyring } = await createDatabase({
        storage,
        keyStorage: leveljs('dxos/echo-demo/keystore'),
        swarmProvider: new SwarmProvider({ signal: 'wss://signal2.dxos.network/dxos/signal' })
      });
      console.log('Created:', String(database));
      setDatabase(database)
      setKeyring(keyring)
    });
  }, []);

  const [resizeListener, size] = useResizeAware();
  const { width, height } = size;
  const grid = useGrid({ width, height });
  const radius = Math.min(grid.size.width, grid.size.height) / 3;

  // Click to invite.
  const handleInvite = async (node) => {
    const party = await database.getParty(node.partyKey);
    const invitation = await party.createInvitation({
      secretProvider: async () => Buffer.from('0000'),
      secretValidator: async () => true,
    });

    console.log(JSON.stringify(invitation.toQueryParameters()))
  };

  const [invitation, setInvitation] = useState('')

  async function handleJoin() {
    console.log('handleJoin', invitation)
    const party = await database.joinParty(InvitationDescriptor.fromQueryParameters(JSON.parse(invitation)), async () => Buffer.from('0000'));
    await party.open();
  }

  async function resetStorage() {
    localStorage.clear();
    await keyring.deleteAllKeyRecords();
    await storage.destroy();
    window.location.reload();
  }

  return (
    <FullScreen>
      {resizeListener}

      <div style={{ position: 'absolute' }}>
        <input value={invitation} onChange={e => setInvitation((e.currentTarget as any).value)} />
        <button onClick={handleJoin}>Join</button>
        <br />
        <button onClick={resetStorage}>ResetStorage</button>
      </div>

      <SVG width={width} height={height}>
        <Grid grid={grid} />

        <Markers />

        {database  && <EchoContext.Provider key={id} value={{ database }}>
          <EchoGraph
            id={id}
            grid={grid}
            delta={{ x: 0, y: 0 }}
            radius={radius}
            onSelect={node => node.type === 'party' && handleInvite(node)}
          />
        </EchoContext.Provider>}

      </SVG>
    </FullScreen>
  );
}
