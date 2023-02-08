//
// Copyright 2023 DXOS.org
//

import React from 'react';
import { useNavigate, generatePath } from 'react-router-dom';

import { SpacesPageComponent } from '@dxos/react-appkit';
import { Document } from '@dxos/react-client';

export type SpacesPageProps = {};

export const SpacesPage = (props: SpacesPageProps) => {
  const navigate = useNavigate();
  return (
    <SpacesPageComponent
      onSpaceCreated={async (space) => {
        const defaultList = new Document({ type: 'list' });
        void space.experimental.db.save(defaultList);
      }}
      onSpaceJoined={({ spaceKey }) => {
        if (!spaceKey) {
          return null;
        }
        navigate(generatePath('/space/:spaceId', { spaceId: spaceKey.toHex() }));
      }}
    />
  );
};
