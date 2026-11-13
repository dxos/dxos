//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import React, { useState } from 'react';

import { Identity } from '@dxos/halo';
import { useHaloServices } from '@dxos/halo-react';

import { type Stage, reached } from '../stage.ts';
import { Guest } from './Invitations.tsx';
import { Prompt } from './ui.tsx';

/** The device before it has an identity: start one, join one from another device, or recover one. */
export const Welcome = ({ stage }: { stage: Stage }) => {
  const services = useHaloServices();
  const [mode, setMode] = useState<'new' | 'device' | 'recover'>('new');
  // Focusing the first field on load would scroll the page to the embed.
  const [picked, setPicked] = useState(false);
  const pick = (next: typeof mode) => {
    setPicked(true);
    setMode(next);
  };

  // #region create
  /** Creates the identity, with this device as its first member. */
  const handleStart = (name: string) =>
    Identity.create({ displayName: name }).pipe(
      Effect.provide(services),
      Effect.runPromise,
    );
  // #endregion

  // #region join
  /** Redeems the invitation `code` from your other device, and returns the flow. */
  const handleJoin = (code: string) =>
    Identity.join(code).pipe(Effect.provide(services), Effect.runPromise);
  // #endregion

  // #region recover
  /** Gets the identity back with `recoveryCode`. */
  const handleRecover = (recoveryCode: string) =>
    Identity.recover({ recoveryCode: recoveryCode.trim() }).pipe(
      Effect.provide(services),
      Effect.runPromise,
    );
  // #endregion

  return (
    <div className='cb-welcome'>
      {mode === 'new' && (
        <Prompt
          label="What's your name?"
          action='Start'
          autoFocus={picked}
          onSubmit={handleStart}
        />
      )}
      {mode === 'device' && (
        <Guest label='Code from your other device' join={handleJoin} />
      )}
      {mode === 'recover' && (
        <Prompt
          label='Your recovery code'
          action='Recover'
          multiline
          onSubmit={handleRecover}
        />
      )}
      <div className='cb-row cb-links'>
        {mode !== 'new' && (
          <button className='cb-link' onClick={() => pick('new')}>
            Start a new contact book
          </button>
        )}
        {reached(stage, 'devices') && mode !== 'device' && (
          <button className='cb-link' onClick={() => pick('device')}>
            Join your other device
          </button>
        )}
        {reached(stage, 'recovery') && mode !== 'recover' && (
          <button className='cb-link' onClick={() => pick('recover')}>
            Recover with a code
          </button>
        )}
      </div>
    </div>
  );
};
