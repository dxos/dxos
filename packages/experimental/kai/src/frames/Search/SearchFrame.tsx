//
// Copyright 2023 DXOS.org
//

import React from 'react';
import { useNavigate } from 'react-router-dom';

import { Document } from '@dxos/echo-schema';

import { createPath, useAppRouter } from '../../hooks';
import { objectMap, SearchPanel } from './SearchPanel';

export const SearchFrame = () => {
  const navigate = useNavigate();
  const { space } = useAppRouter();

  const handleSelect = (object: Document) => {
    console.log(object.id);
    if (space) {
      const frame = objectMap[object.__typename!]?.frame;
      if (frame) {
        navigate(createPath({ spaceKey: space.key, frame: frame?.module.id, objectId: object.id }));
      }
    }
  };

  return <SearchPanel onSelect={handleSelect} />;
};
