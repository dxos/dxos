//
// Copyright 2023 DXOS.org
//

import React from 'react';
import { useNavigate } from 'react-router-dom';

import { TypedObject } from '@dxos/echo-schema';

import { SearchPanel } from '../../containers';
import { createPath, objectMeta, useAppRouter } from '../../hooks';

export const SearchFrame = () => {
  const navigate = useNavigate();
  const { space } = useAppRouter();

  const handleSelect = (object: TypedObject) => {
    if (space) {
      const frame = objectMeta[object.__typename!]?.frame;
      if (frame) {
        navigate(createPath({ spaceKey: space.key, frame: frame?.module.id, objectId: object.id }));
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
