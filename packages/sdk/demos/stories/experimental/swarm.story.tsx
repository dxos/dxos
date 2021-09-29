//
// Copyright 2020 DXOS.org
//

import debug from 'debug';
import React, { useState } from 'react';
import useResizeAware from 'react-resize-aware';

import { Button, TextField, Toolbar } from '@material-ui/core';

import { createId, PublicKey } from '@dxos/crypto';
import { InvitationDescriptor } from '@dxos/echo-db';
import { FullScreen, SVG, useGrid } from '@dxos/gem-core';
import { Markers } from '@dxos/gem-spore';
import { ClientInitializer, ProfileInitializer, useClient } from '@dxos/react-client';

import { EchoGraph, MemberList, Node, ONLINE_CONFIG } from '../../src';

const log = debug('dxos:echo:story');

debug.enable('dxos:echo:story:*, dxos:*:error');

export default {
  title: 'Experimental/Swarm'
};

const Story = () => {
  const [id] = useState(createId());
  const [invitation, setInvitation] = useState<string | undefined>(undefined);
  const client = useClient();

  const [resizeListener, size] = useResizeAware();
  const { width, height } = size;
  const grid = useGrid({ width, height });
  const radius = Math.min(grid.size.width, grid.size.height) / 3;

  // Click to invite.
  const handleInvite = async (node: Node) => {
    if (!node.partyKey) {
      console.warn('Cannot invite to node without party key');
      return;
    }
    const party = await client.echo.getParty(PublicKey.from(node.partyKey));
    if (!party) {
      console.warn(`Party not found: ${node.partyKey.toString()}`);
      return;
    }
    const invitation = await party.createInvitation({
      secretProvider: async () => Buffer.from('0000'),
      secretValidator: async () => true
    });

    setInvitation(JSON.stringify(invitation.toQueryParameters()));
  };

  const handleJoin = async () => {
    log('handleJoin', invitation);
    if (!invitation) {
      console.warn('Cannot join party without invitation.');
      return;
    }
    const party = await client.echo.joinParty(
      InvitationDescriptor.fromQueryParameters(JSON.parse(invitation)), async () => Buffer.from('0000'));
    await party.open();
  };

  const handleResetStorage = async () => {
    await client.reset();
    window.location.reload();
  };

  const activeParty = client.echo.queryParties().value[0];

  return (
    <FullScreen>
      <div style={{ display: 'flex', flex: 1, flexDirection: 'column', overflow: 'hidden' }}>
        <Toolbar>
          <TextField
            style={{ flex: 1 }}
            placeholder="Invitation code"
            inputProps={{ spellCheck: false }}
            multiline={true}
            rows={3}
            value={invitation || ''}
            onChange={event => setInvitation((event.currentTarget as any).value)}
          />
          <div>
            <Button onClick={handleJoin}>Join</Button>
            <Button onClick={handleResetStorage}>Reset</Button>
          </div>
        </Toolbar>

        {activeParty && <MemberList party={client.echo.queryParties().first} />}

        <div style={{ display: 'flex', flex: 1, position: 'relative' }}>
          {resizeListener}
          <SVG width={width} height={height}>
            <Markers />

            <EchoGraph
              id={id}
              grid={grid}
              radius={radius}
              onSelect={(node: Node) => node.type === 'party' && handleInvite(node)}
            />
          </SVG>
        </div>
      </div>
    </FullScreen>
  );
};

export const Primary = () => (
  <ClientInitializer config={ONLINE_CONFIG}>
    <ProfileInitializer>
      <Story/>
    </ProfileInitializer>
  </ClientInitializer>
);
