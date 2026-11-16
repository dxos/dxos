//
// Copyright 2026 DXOS.org
//

import './contact-book.css';

import React, { useEffect, useState } from 'react';

// `@dxos/keys` reads `Buffer` as it loads, so the globals go in before anything
// else.
import '@dxos/node-std/globals';
import { ConnectionState } from '@dxos/client/mesh';
import { HaloProvider } from '@dxos/halo-react';

import { type Device, type Scene, startScene } from '../runtime.ts';
import { type Stage } from '../stage.ts';
import { ContactBook } from './ContactBook.tsx';

export type EmbedProps = {
  stage: Stage;
  scene: Scene;
};

/**
 * A live embed of the contact book as it stands at `stage`, on the devices
 * `scene` starts; `/embed/halo/` renders it.
 */
export const Embed = ({ stage, scene }: EmbedProps) => {
  const [devices, setDevices] = useState<Device[]>();
  const [error, setError] = useState<string>();
  useEffect(() => {
    startScene(scene).then(setDevices, (error) => setError(String(error)));
  }, [scene]);

  return (
    <div className='cb-root cb-devices'>
      {error ? (
        <p className='cb-error cb-pad'>{error}</p>
      ) : !devices ? (
        <p className='cb-muted cb-pad'>Starting…</p>
      ) : (
        devices.map((device) => (
          <Frame key={device.label} device={device} stage={stage} />
        ))
      )}
    </div>
  );
};

/**
 * One device: a frame with its label and a switch that takes it off the
 * network, around the app. The frame is the demo's, not the app's.
 */
const Frame = ({ device, stage }: { device: Device; stage: Stage }) => {
  const [online, setOnline] = useState(true);
  const handleChange = (online: boolean) => {
    setOnline(online);
    void device.client.mesh.updateConfig(
      online ? ConnectionState.ONLINE : ConnectionState.OFFLINE,
    );
  };

  return (
    <section
      className='cb-frame'
      style={{ borderTopColor: `var(--cb-${device.hue})` }}
    >
      <header className='cb-frame-header'>
        <span>{device.label}</span>
        <label className='cb-switch'>
          <input
            type='checkbox'
            checked={online}
            onChange={(event) => handleChange(event.target.checked)}
          />
          {online ? 'Online' : 'Offline'}
        </label>
      </header>
      <HaloProvider services={device.services}>
        <ContactBook stage={stage} />
      </HaloProvider>
    </section>
  );
};
