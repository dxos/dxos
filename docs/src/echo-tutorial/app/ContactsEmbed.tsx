//
// Copyright 2026 DXOS.org
//

import '@dxos-theme';
import '../../styles/island-base.generated.css';

import React, { type PropsWithChildren, useEffect, useState } from 'react';

// `@dxos/keys` reads `Buffer` as it loads, so the globals go in before anything
// else.
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

const translations = [
  ...uiTranslations,
  ...formTranslations,
  ...tableTranslations,
];

/** The theme and translations the app's components need. */
export const Themed = ({ children }: PropsWithChildren) => (
  <Theme.Provider tx={Theme.defaultTx} resourceExtensions={translations}>
    <div className='flex h-full min-h-0 bg-base-surface text-base-fg'>
      {children}
    </div>
  </Theme.Provider>
);

export type ContactsEmbedProps = {
  stage: Stage;
  peers?: 1 | 2;
};

/**
 * A live embed of the tutorial app as it stands at `stage`; `/embed/contacts/`
 * renders it. With two devices, each has a space of its own until one joins
 * the other's.
 */
export const ContactsEmbed = ({ stage, peers = 1 }: ContactsEmbedProps) => {
  const [started, setStarted] = useState<Peer[]>();
  const [error, setError] = useState<string>();
  useEffect(() => {
    startPeers(peers).then(setStarted, (error) => setError(String(error)));
  }, [peers]);

  return (
    <Themed>
      {error ? (
        <p className='p-4 text-error-text'>{error}</p>
      ) : !started ? (
        <p className='p-4 text-description'>Starting…</p>
      ) : (
        started.map((peer) => (
          <Device
            key={peer.name}
            peer={peer}
            stage={stage}
            compact={started.length > 1}
          />
        ))
      )}
    </Themed>
  );
};

/**
 * One device: a frame with its owner's name and a switch that takes it off the
 * network, around the app. The frame is the demo's, not the app's.
 */
const Device = ({
  peer,
  stage,
  compact,
}: {
  peer: Peer;
  stage: Stage;
  compact: boolean;
}) => {
  const [online, setOnline] = useState(true);
  const handleChange = (online: boolean) => {
    setOnline(online);
    void peer.client.mesh.updateConfig(
      online ? ConnectionState.ONLINE : ConnectionState.OFFLINE,
    );
  };

  return (
    <div className='flex flex-col dx-grow border-e border-separator last:border-e-0'>
      {compact && (
        <div
          className='flex items-center gap-2 px-3 py-1 text-sm border-b border-separator bg-group-surface'
          style={{ borderTop: `3px solid var(--color-${peer.hue}-border)` }}
        >
          <span className='font-medium'>{peer.name}'s device</span>
          <span className='ms-auto' />
          <Input.Switch
            classNames='text-sm'
            label={online ? 'Online' : 'Offline'}
            checked={online}
            onCheckedChange={({ checked }) => handleChange(checked)}
          />
        </div>
      )}
      <div className='dx-grow'>
        <PeerApp
          client={peer.client}
          space={peer.space}
          stage={stage}
          compact={compact}
        />
      </div>
    </div>
  );
};
