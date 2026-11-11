//
// Copyright 2026 DXOS.org
//

import '@dxos-theme';


import React, { useEffect, useState } from 'react';

// `@dxos/keys` reads `Buffer` as it loads, so the globals go in before anything else.
import '@dxos/node-std/globals';
import '@dxos/react-ui/theme.css';
import '@dxos/react-ui-graph/styles/graph.css';
import { ConnectionState } from '@dxos/react-client/mesh';
import { translations as formTranslations } from '@dxos/react-ui-form/translations';
import { translations as tableTranslations } from '@dxos/react-ui-table/translations';
import * as Input from '@dxos/react-ui/Input';
import * as Theme from '@dxos/react-ui/Theme';
import { translations as uiTranslations } from '@dxos/react-ui/translations';

import { type Peer, startPeers } from '../runtime.ts';
import { type Stage } from './Contacts.tsx';
import { PeerApp } from './PeerApp.tsx';

const translations = [...uiTranslations, ...formTranslations, ...tableTranslations];

export type ContactsEmbedProps = {
  stage: Stage;
  peers?: 1 | 2;
};

/** A live embed of the tutorial app as it stands at `stage`: `<ContactsEmbed stage='records' client:only='react' />`. */
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
            <div key={peer.name} className='flex flex-col dx-grow border-e border-separator last:border-e-0'>
              {started.length > 1 && <PeerBar peer={peer} />}
              <div className='dx-grow'>
                <PeerApp client={peer.client} space={peer.space} stage={stage} compact={started.length > 1} />
              </div>
            </div>
          ))
        )}
      </div>
    </Theme.Provider>
  );
};

/** The peer's name, and a switch that takes it off the network. */
const PeerBar = ({ peer }: { peer: Peer }) => {
  const [online, setOnline] = useState(true);
  const handleChange = (online: boolean) => {
    setOnline(online);
    void peer.client.mesh.updateConfig(online ? ConnectionState.ONLINE : ConnectionState.OFFLINE);
  };

  return (
    <div
      className='flex items-center gap-2 px-3 py-1 text-sm border-b border-separator'
      style={{ borderTop: `3px solid var(--color-${peer.hue}-border)` }}
    >
      <span className='font-medium'>{peer.name}</span>
      <span className='ms-auto' />
      <Input.Switch
        classNames='text-sm'
        label={online ? 'Online' : 'Offline'}
        checked={online}
        onCheckedChange={({ checked }) => handleChange(checked)}
      />
    </div>
  );
};
