//
// Copyright 2026 DXOS.org
//

import './contact-book.css';

import type * as Layer from 'effect/Layer';
import React, { useEffect, useState } from 'react';

// `@dxos/keys` reads `Buffer` as it loads, so the globals go in before the client.
import '@dxos/node-std/globals';

import { type Halo, openHalo } from '../client.ts';
import { getProgress } from '../progress.ts';
import { ContactBook } from './ContactBook.tsx';

/**
 * The contact book as a project of its own, as StackBlitz runs it: one real
 * client, kept on this device, as far as its modules are written, under the
 * step that writes the next piece.
 */
export const App = () => {
  const { stage, next } = getProgress();
  const [halo, setHalo] = useState<Layer.Layer<Halo>>();
  const [error, setError] = useState<string>();
  useEffect(() => {
    if (stage) {
      openHalo().then(
        ({ halo }) => setHalo(halo),
        (error) => setError(String(error)),
      );
    }
  }, [stage]);

  return (
    <div className='cb-root cb-app'>
      {next && (
        <p className='cb-next'>
          <strong>Next:</strong> {next}. Fill in the TODO for it, and the app
          picks it up when you save.
        </p>
      )}
      {error && <p className='cb-error cb-pad'>{error}</p>}
      {stage && halo && (
        <section className='cb-frame'>
          <ContactBook halo={halo} stage={stage} />
        </section>
      )}
    </div>
  );
};
