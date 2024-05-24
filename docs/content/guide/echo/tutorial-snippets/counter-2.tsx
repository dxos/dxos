//
// Copyright 2023 DXOS.org
//

import { Expando, useQuery, useSpaces } from '@dxos/react-client/echo';
import { useIdentity } from '@dxos/react-client/halo';
import React, { useEffect } from 'react';

export const Counter = () => {
  useIdentity();
  const [space] = useSpaces();
  const [counter] = useQuery(space, { type: 'counter' });

  useEffect(() => {
    if (space && !counter) {
      const counter = create(Expando, { type: 'counter', values: [] });
      space.db.add(counter);
    }
  }, [space, counter]);

  return (
    <div>
      {counter && (
        <div className='text-center'>
          <button
            className='border bg-white py-2 px-4 rounded'
            onClick={() => {
              counter.values.push(1);
            }}
          >
            Click me
          </button>
          <p>Clicked {counter.values.length ?? 0} times.</p>
        </div>
      )}
    </div>
  );
};
