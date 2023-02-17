//
// Copyright 2023 DXOS.org
//

import React, { useEffect, useRef } from 'react';

import { useQuery, Document, useIdentity, useSpace } from '@dxos/react-client';
import { Loading } from '@dxos/react-components';

export const Counter = () => {
  const identity = useIdentity({ login: true });
  const space = useSpace(null, { create: true });
  const [counter] = useQuery(space, { type: 'counter' });
  const creating = useRef(false);
  useEffect(() => {
    console.log('counter effect', counter, space, creating.current);
    if (!counter && space && !creating.current) {
      creating.current = true;
      const c = new Document({ type: 'counter' });
      void space.db
        .add(c)
        .catch((err) => {
          console.error(err);
          creating.current = false;
        })
        .then(() => (creating.current = false));
    }
  }, [counter, space]);
  if (!space) {
    return <Loading label='Loading' />;
  }
  return (
    <div>
      {identity && `Hello ${identity?.displayName}!`}
      {counter && (
        <button
          className='p-4 m-2 border'
          onClick={() => {
            counter.count = (counter.count ?? 0) + 1;
          }}
        >
          {counter.count ? `Clicked ${counter.count} times` : 'click me!'}
        </button>
      )}
    </div>
  );
};
