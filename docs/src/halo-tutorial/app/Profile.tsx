//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import React, { useState } from 'react';

import { Identity } from '@dxos/halo';
import { useHaloServices } from '@dxos/halo-react';

import { Prompt, initial } from './ui.tsx';

/** Your name, which you click to change. */
export const ProfileChip = ({ name }: { name?: string }) => {
  const services = useHaloServices();
  const [editing, setEditing] = useState(false);

  // #region rename
  /** Changes the name everyone who shares a space with you sees. */
  const handleRename = (name: string) =>
    Identity.updateProfile({ displayName: name }).pipe(
      Effect.provide(services),
      Effect.runPromise,
    );
  // #endregion

  return editing ? (
    <Prompt
      label='Your name'
      action='Save'
      initial={name}
      compact
      onSubmit={(name) => handleRename(name).then(() => setEditing(false))}
    />
  ) : (
    <button
      className='cb-chip'
      title='Change your name'
      onClick={() => setEditing(true)}
    >
      <span className='cb-avatar'>{initial(name)}</span>
      {name ?? 'Anonymous'}
    </button>
  );
};
