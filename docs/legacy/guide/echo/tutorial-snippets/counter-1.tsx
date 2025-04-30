//
// Copyright 2023 DXOS.org
//

import React from 'react';

import { useSpaces, useQuery } from '@dxos/react-client/echo';
import { useIdentity } from '@dxos/react-client/halo';

export const Counter = () => {
  // Get the user to log in before a space can be obtained.
  useIdentity();
  // Get the first available space, created with the identity.
  const [space] = useSpaces();

  const [counter] = useQuery(space, { type: 'counter' });

  return (
    <div>
      {counter && (
        <div className='text-center'>
          Clicked {counter.values.length ?? 0} times.
        </div>
      )}
    </div>
  );
};
