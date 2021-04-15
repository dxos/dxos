//
// Copyright 2020 DXOS.org
//

import debug from 'debug'
import leveljs from 'level-js';
import React, { useEffect, useState } from 'react';
import useResizeAware from 'react-resize-aware';

import { Button, TextField, Toolbar } from '@material-ui/core';

import { createId, createKeyPair, humanize, keyToString } from '@dxos/crypto';
import { ECHO, InvitationDescriptor } from '@dxos/echo-db';
import { FullScreen, SVG, useGrid } from '@dxos/gem-core';
import { Markers } from '@dxos/gem-spore';
import { createStorage } from '@dxos/random-access-multi-storage';
import { Keyring } from '@dxos/credentials';

import { createECHO, EchoContext, EchoGraph, usePartyMembers } from '../src';
import { MemberList } from '../src/components/MemberList';

const log = debug('dxos:echo:demo');
debug.enable('dxos:*');

export default {
  title: 'Demo',
  decorators: []
};

export const withSwarm = () => {
  const [id] = useState(createId());
  const [database, setDatabase] = useState<ECHO>();
  const [storage] = useState(() => createStorage('dxos/echo-demo'));
  const [snapshotStorage] = useState(() => createStorage('dxos/echo-demo/snapshots'));

  useEffect(() => {
    setImmediate(async () => {
      try {
        const { echo } = await createECHO({
          storage,
          keyStorage: leveljs('dxos/echo-demo/keystore'),
          // TODO(burdon): Move const to config.
          networkManagerOptions: { signal: 'wss://signal2.dxos.network/dxos/signal' },
          snapshotStorage,
          snapshotInterval: 10,
        });
        log('Created:', String(echo));

        await echo.open();
        setDatabase(echo);

        if(!echo.identityKey) {
          await echo.createIdentity(createKeyPair());
          await echo.createHalo();
        }
      } catch(err) {
        console.error(err)
      }
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
    await database.reset();
    window.location.reload();
  }

  const activeParty = database?.queryParties().value[0]

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

        {activeParty && <MemberList party={database.queryParties().first} />}

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
