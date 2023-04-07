//
// Copyright 2023 DXOS.org
//

import React from 'react';

import { TypedObject } from '@dxos/echo-schema';
import { useFrameContext, useFrameRouter } from '@dxos/kai-frames';

import { SearchPanel } from '../../containers';
import { objectMeta } from '../../frames';

export const SearchFrame = () => {
  const { space } = useFrameContext();
  const router = useFrameRouter();

  const handleSelect = (object: TypedObject) => {
    if (space) {
      const frame = objectMeta[object.__typename!]?.frame;
      if (frame) {
        router({ space, frame, objectId: object.id });
      }
    }
  };

  return (
    <div role='none' className='flex flex-col flex-1 min-bs-full mli-auto is-full md:is-column bg-paper-bg shadow-1'>
      <SearchPanel onSelect={handleSelect} />
    </div>
  );
};

export default SearchFrame;
