//
// Copyright 2026 DXOS.org
//

import '@dxos-theme';
import '../../styles/island-base.generated.css';

import React, { useEffect, useState } from 'react';

// `@dxos/keys` reads `Buffer` as it loads, so the globals go in before anything
// else.
import '@dxos/node-std/globals';
import '@dxos/react-ui/theme.css';
import '@dxos/react-ui-graph/styles/graph.css';
import { type Client } from '@dxos/client';
import { type Space } from '@dxos/client/echo';
import { ConnectionState } from '@dxos/react-client/mesh';
import { translations as formTranslations } from '@dxos/react-ui-form/translations';
import { translations as tableTranslations } from '@dxos/react-ui-table/translations';
import * as Button from '@dxos/react-ui/Button';
import * as Input from '@dxos/react-ui/Input';
import * as Theme from '@dxos/react-ui/Theme';
import { translations as uiTranslations } from '@dxos/react-ui/translations';

import { type Stage } from '../progress.ts';
import { type Peer, startPeers } from '../runtime.ts';
import { acceptInvite, createInvite } from '../sharing.ts';
import { PeerApp } from './PeerApp.tsx';

const translations = [
  ...uiTranslations,
  ...formTranslations,
  ...tableTranslations,
];

export type ContactsEmbedProps = {
  stage: Stage;
  peers?: 1 | 2;
};

/**
 * A live embed of the tutorial app as it stands at `stage`; `/embed/contacts/`
 * renders it. With two peers, the first invites the second.
 */
export const ContactsEmbed = ({ stage, peers = 1 }: ContactsEmbedProps) => {
  const [started, setStarted] = useState<Peer[]>();
  const [error, setError] = useState<string>();
  useEffect(() => {
    startPeers(peers).then(setStarted, (error) => setError(String(error)));
  }, [peers]);

  return (
    <Theme.Provider tx={Theme.defaultTx} resourceExtensions={translations}>
      <div className='flex h-full min-h-0 bg-base-surface text-base-fg'>
        {error ? (
          <p className='p-4 text-error-text'>{error}</p>
        ) : !started ? (
          <p className='p-4 text-description'>Starting…</p>
        ) : (
          started.map((peer) => (
            <PeerPanel
              key={peer.name}
              peer={peer}
              stage={stage}
              shared={started.length > 1}
            />
          ))
        )}
      </div>
    </Theme.Provider>
  );
};

/** One peer: its bar when the app is shared, then its app or, before it has joined, a field for the invitation. */
const PeerPanel = ({
  peer,
  stage,
  shared,
}: {
  peer: Peer;
  stage: Stage;
  shared: boolean;
}) => {
  const [space, setSpace] = useState(peer.space);
  return (
    <div className='flex flex-col dx-grow border-e border-separator last:border-e-0'>
      {shared && <PeerBar peer={peer} space={space} />}
      <div className='dx-grow'>
        {space ? (
          <PeerApp
            client={peer.client}
            space={space}
            stage={stage}
            compact={shared}
          />
        ) : (
          <AcceptInvite client={peer.client} onJoin={setSpace} />
        )}
      </div>
    </div>
  );
};

/**
 * The peer's name, a button that invites another peer to its space, and a
 * switch that takes it off the network.
 */
const PeerBar = ({ peer, space }: { peer: Peer; space?: Space }) => {
  const [online, setOnline] = useState(true);
  const [code, setCode] = useState<string>();
  const handleChange = (online: boolean) => {
    setOnline(online);
    void peer.client.mesh.updateConfig(
      online ? ConnectionState.ONLINE : ConnectionState.OFFLINE,
    );
  };
  const handleInvite = async () => {
    if (space) {
      const code = await createInvite(space);
      setCode(code);
      await navigator.clipboard?.writeText(code).catch(() => {});
    }
  };

  return (
    <div
      className='flex flex-col gap-2 px-3 py-1 text-sm border-b border-separator'
      style={{ borderTop: `3px solid var(--color-${peer.hue}-border)` }}
    >
      <div className='flex items-center gap-2'>
        <span className='font-medium'>{peer.name}</span>
        {space && (
          <Button.Root
            icon='ph--user-plus--regular'
            label={code ? 'Copied invitation' : 'Create invitation'}
            onClick={() => void handleInvite()}
          />
        )}
        <span className='ms-auto' />
        <Input.Switch
          classNames='text-sm'
          label={online ? 'Online' : 'Offline'}
          checked={online}
          onCheckedChange={({ checked }) => handleChange(checked)}
        />
      </div>
      {code && (
        <Input.Root
          aria-label='Invitation code'
          readOnly
          value={code}
          onFocus={(event) => event.target.select()}
        />
      )}
    </div>
  );
};

/** A field for an invitation code; joining hands the peer the space. */
const AcceptInvite = ({
  client,
  onJoin,
}: {
  client: Client;
  onJoin: (space: Space) => void;
}) => {
  const [code, setCode] = useState('');
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState<string>();
  const handleJoin = () => {
    setJoining(true);
    setError(undefined);
    acceptInvite(client, code.trim()).then(onJoin, (error) => {
      setJoining(false);
      setError(String(error));
    });
  };

  return (
    <div className='flex flex-col gap-2 p-3'>
      <p className='text-sm text-description'>
        Paste an invitation from another peer to join its space.
      </p>
      <Input.Root
        aria-label='Invitation code'
        placeholder='Invitation code'
        value={code}
        onChange={(event) => setCode(event.target.value)}
      />
      <Button.Root
        icon='ph--sign-in--regular'
        label={joining ? 'Joining…' : 'Join'}
        disabled={joining || code.trim().length === 0}
        onClick={handleJoin}
      />
      {error && <p className='text-sm text-error-text'>{error}</p>}
    </div>
  );
};
