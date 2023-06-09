//
// Copyright 2023 DXOS.org
//

import React, { useEffect } from 'react';

import { Loading } from '@dxos/react-appkit';
import { Expando, useQuery, useIdentity, useSpaces } from '@dxos/react-client';

export const Counter = () => {
  const identity = useIdentity({ login: true });
  const [space] = useSpaces();
  const [counter] = useQuery(space, { type: 'counter' });

  useEffect(() => {
    if (!counter && space) {
      const counter = new Expando({ type: 'counter' });
      void space.db.add(counter);
    }
  }, [counter, space]);

  if (!space) {
    return <Loading label='Loading' />;
  }

  return (
    <div>
      {identity && `Hello ${identity?.profile?.displayName}!`}
      {counter && (
        <button
          className='p-4 m-2 border'
          onClick={() => {
            counter.count = (counter.count ?? 0) + 1;
          }}
        >
          {counter.count ? `Clicked ${counter.count} times` : 'Click me!'}
        </button>
      )}
    </div>
  );
};
