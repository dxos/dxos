//
// Copyright 2026 DXOS.org
//

import React, { useEffect, useState } from 'react';

import { type Client } from '@dxos/client';
import { type Space } from '@dxos/client/echo';

import { openSpace } from '../client.ts';
import { getProgress } from '../progress.ts';
import { seed } from '../seed.ts';
import { Themed } from './ContactsEmbed.tsx';
import { PeerApp } from './PeerApp.tsx';

/** The space the app showed last, which may be one it joined. */
const CURRENT_SPACE = 'contacts:space';
const seededKey = (space: Space) => `contacts:seeded:${space.id}`;

/**
 * The app as a project of its own, as StackBlitz runs it: one real client,
 * kept on this device, as far as its modules are written, under the step that
 * writes the next piece.
 */
export const App = () => {
  const { stage, next } = getProgress();
  const [opened, setOpened] = useState<{ client: Client; space: Space }>();
  const [error, setError] = useState<string>();
  useEffect(() => {
    if (!stage) {
      return;
    }

    const open = async () => {
      const { client, space } = await openSpace();
      if (localStorage.getItem(seededKey(space)) === null) {
        seed(space.db);
        localStorage.setItem(seededKey(space), 'true');
      }
      const saved = client.spaces
        .get()
        .find((space) => space.id === localStorage.getItem(CURRENT_SPACE));
      await saved?.waitUntilReady();
      setOpened({ client, space: saved ?? space });
    };
    open().catch((error) => setError(String(error)));
  }, [stage]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {next && (
        <p
          style={{
            margin: 0,
            padding: '0.75rem 1rem',
            font: '14px system-ui',
            background: '#fff4d6',
            color: '#3d2c00',
          }}
        >
          <strong>Next:</strong> {next}. Fill in the TODO for it, and the app
          picks it up when you save.
        </p>
      )}
      <div style={{ flex: 1, minHeight: 0 }}>
        {error && <p style={{ padding: '1rem' }}>{error}</p>}
        {stage && opened && (
          <Themed>
            <div className='dx-grow min-w-0'>
              <PeerApp
                client={opened.client}
                space={opened.space}
                stage={stage}
                onSpaceChange={(space) =>
                  localStorage.setItem(CURRENT_SPACE, space.id)
                }
              />
            </div>
          </Themed>
        )}
      </div>
    </div>
  );
};
