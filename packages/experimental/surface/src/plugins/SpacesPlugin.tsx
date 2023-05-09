//
// Copyright 2023 DXOS.org
//

import { Planet } from '@phosphor-icons/react';
import React from 'react';

import { PublicKey, useSpaces } from '@dxos/react-client';

import { Action, Plugin, useActionDispatch } from '../framework';

// TODO(burdon): Factor out.
// TODO(burdon): Combine with object selector.
export type SelectSpaceAction = Action & {
  type: 'space-select';
  spaceKey: PublicKey;
};

const SpacesPanel = () => {
  const spaces = useSpaces();
  const dispatch = useActionDispatch();

  // TODO(burdon): Action handler.
  return (
    <div>
      <h2 className='text-sm'>Spaces</h2>
      <div>
        {spaces.map((space) => (
          <div key={space.key.toHex()} className='flex items-center'>
            <Planet />
            <div className='ml-1 pointer' onClick={() => dispatch({ type: 'space-select', spaceKey: space.key })}>
              {space.properties.name}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export class SpacesPlugin extends Plugin {
  constructor() {
    super({
      id: 'org.dxos.spaces',
      components: {
        main: SpacesPanel
      }
    });
  }
}
