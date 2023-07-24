//
// Copyright 2023 DXOS.org
//

import React from 'react';
import { useNavigate, generatePath } from 'react-router-dom';

import { SpacesPageComponent } from '@dxos/react-appkit';
import { Expando } from '@dxos/react-client/echo';

export type SpacesPageProps = {};

export const SpacesPage = (props: SpacesPageProps) => {
  const navigate = useNavigate();
  return (
    <SpacesPageComponent
      onSpaceCreated={async (space) => {
        const defaultList = new Expando({ type: 'list' });
        void space.db.add(defaultList);
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
