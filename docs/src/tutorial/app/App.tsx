//
// Copyright 2026 DXOS.org
//

import React from 'react';

import { getProgress } from '../progress.ts';
import { ContactsEmbed } from './ContactsEmbed.tsx';

/**
 * The app as a project of its own, as StackBlitz runs it: as far as its modules
 * are written, under the step that writes the next piece.
 */
export const App = () => {
  const { stage, next } = getProgress();
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
        {stage && (
          <ContactsEmbed stage={stage} peers={stage === 'complete' ? 2 : 1} />
        )}
      </div>
    </div>
  );
};
