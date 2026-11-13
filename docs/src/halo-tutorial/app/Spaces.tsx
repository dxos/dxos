//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import React, { useState } from 'react';

import { Space } from '@dxos/halo';
import { useHaloServices } from '@dxos/halo-react';
import { type SpaceId } from '@dxos/keys';

import { Prompt } from './ui.tsx';

/** Picks the current space, and makes new ones. */
export const SpacePicker = ({
  spaces,
  current,
  onSelect,
}: {
  spaces: readonly Space.Info[];
  current?: SpaceId;
  onSelect: (id: SpaceId) => void;
}) => {
  const services = useHaloServices();
  const [creating, setCreating] = useState(false);

  // #region create
  /** Creates a space called `name`, waits until it opens, and selects it. */
  const handleCreate = (name: string) =>
    Effect.gen(function* () {
      const space = yield* Space.create({ name });
      yield* Space.waitReady(space.id);
      return space;
    })
      .pipe(Effect.provide(services), Effect.runPromise)
      .then((space) => onSelect(space.id));
  // #endregion

  if (creating) {
    return (
      <Prompt
        label='Space name'
        action='Create'
        compact
        onSubmit={(name) => handleCreate(name).then(() => setCreating(false))}
      />
    );
  }
  return (
    <div className='cb-row'>
      {spaces.length > 0 && (
        <select
          className='cb-select'
          aria-label='Space'
          value={current}
          onChange={(event) => {
            const space = spaces.find((s) => s.id === event.target.value);
            space && onSelect(space.id);
          }}
        >
          {spaces.map((space) => (
            <option key={space.id} value={space.id}>
              {space.name}
            </option>
          ))}
        </select>
      )}
      <button className='cb-button' onClick={() => setCreating(true)}>
        New space
      </button>
    </div>
  );
};
