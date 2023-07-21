//
// Copyright 2022 DXOS.org
//

import React from 'react';
import { useQuery, useSpace } from '@dxos/react-client/echo';

// ensure there is a ClientProvider somewhere in the tree above
export const Component = () => {
  const space = useSpace('<space-key>');
  const objects = useQuery(space, {});

  return (
    <div
      onClick={() => {
        // mutate objects directly and they will be replicated to all peers
        const object = objects[0];
        object.counter = 0;
        object.name = 'example';
      }}
    ></div>
  );
};
