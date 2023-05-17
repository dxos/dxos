//
// Copyright 2023 DXOS.org
//

import React, { useEffect } from 'react';
import { Outlet, useNavigate, useParams } from 'react-router';
import { RouterProvider, createMemoryRouter } from 'react-router-dom';

import { useSpace } from '@dxos/react-client';

import { definePlugin, Surface } from '../framework';
import { useListViewContext } from './ListViewPlugin';

export const EntityContainer = () => {
  const { entityId, spaceId } = useParams();
  const space = useSpace(spaceId);
  const entity = space?.db.query((e) => e._id === entityId).objects?.[0];
  return <Surface data={entity} limit={1} />;
};

export const SpaceContainer = () => {
  const { spaceId } = useParams();
  const space = useSpace(spaceId);
  return (
    <Surface data={space} limit={1}>
      <Outlet />
    </Surface>
  );
};

const router = createMemoryRouter([
  {
    path: '/',
    element: (
      <Surface
        component='SplitViewPlugin.SplitView'
        surfaces={{
          sidebar: {
            component: 'ListViewPlugin.ListView'
          }
        }}
      >
        <Outlet />
      </Surface>
    ),
    children: [
      {
        path: 'space/:spaceId',
        element: <SpaceContainer />,
        children: [
          {
            path: ':entityId',
            element: <EntityContainer />
          }
        ]
      }
    ]
  }
]);

export const RoutesPlugin = definePlugin({
  meta: {
    id: 'RoutesPlugin'
  },
  provides: {
    context: () => {
      const { selected } = useListViewContext();
      const { entityId, spaceId } = useParams();
      const navigate = useNavigate();
      useEffect(() => {
        if (selected?.id !== entityId) {
          navigate(`/space/${spaceId}/${entityId}`);
        }
      }, [selected, entityId]);
      return <RouterProvider router={router} fallbackElement={<div>Loading...</div>} />;
    }
  }
});
