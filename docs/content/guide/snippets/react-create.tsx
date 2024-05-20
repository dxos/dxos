//
// Copyright 2022 DXOS.org
//

import { Expando, useSpace } from '@dxos/react-client/echo';
import React from 'react';

// ensure there is a ClientProvider somewhere in the tree above
export const Component = () => {
  const space = useSpace('<space-key>');
  return (
    <div
      onClick={() => {
        // create an Expando object for storing arbitrary JavaScript objects
        const note = create(Expando, { title: 'example' });
        note.description = 'Expandos can have any additional properties.';
        // call this once per object
        // subsequent mutations will be replicated to all peers
        space!.db.add(note);
      }}
    ></div>
  );
};
