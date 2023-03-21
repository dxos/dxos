//
// Copyright 2023 DXOS.org
//

import React, { useEffect } from 'react';

import { Expando, useQuery, useIdentity, useOrCreateFirstSpace } from '@dxos/react-client';
import { Loading } from '@dxos/react-components';

export const Counter = () => {
  const identity = useIdentity({ login: true });
  const space = useOrCreateFirstSpace();
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
