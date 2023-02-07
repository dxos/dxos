//
// Copyright 2023 DXOS.org
//

import React, { useEffect } from 'react';

import { useQuery, Document } from '@dxos/react-client';

import { useDefaultIdentity, useDefaultSpace } from './hooks';

export const Home = () => {
  const identity = useDefaultIdentity();
  const space = useDefaultSpace();
  const key = `Space: ${space.key.toHex().slice(0, 6)}`;
  if (!space) {
    return null; // loading
  }
  const [counter] = useQuery(space, { type: 'counter' });
  useEffect(() => {
    if (!counter) {
      const c = new Document({ type: 'counter' });
      void space.experimental.db.save(c);
    }
  }, [counter]);
  return (
    <div>
      <div>Hello, {identity?.displayName}</div>
      <div>Space: {key}</div>
      {counter && (
        <button
          onClick={() => {
            counter.count = (counter.count ?? 0) + 1;
          }}
        >
          {counter.count ? `Clicked ${counter.count} times` : 'Click me'}
        </button>
      )}
    </div>
  );
};
