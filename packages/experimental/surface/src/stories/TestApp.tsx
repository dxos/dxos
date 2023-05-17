//
// Copyright 2023 DXOS.org
//

import React from 'react';
import { Outlet, useParams } from 'react-router';
import { RouterProvider, createMemoryRouter } from 'react-router-dom';

import { useSpace } from '@dxos/react-client';

import { Surface, PluginContextProvider } from '../framework';
import { ThemePlugin, ClientPlugin, SplitViewPlugin, ListViewPlugin } from '../plugins';

export const EntityContainer = () => {
  const { entityId, spaceId } = useParams();
  const space = useSpace(spaceId);
  const entity = space?.db.query((e) => e._id === entityId).objects?.[0];
  return <Surface data={entity} limit={1}></Surface>;
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

export const TestApp = () => {
  return (
    <PluginContextProvider plugins={[ThemePlugin, ClientPlugin, SplitViewPlugin, ListViewPlugin]}>
      <RouterProvider router={router} fallbackElement={<div>Loading...</div>} />;
    </PluginContextProvider>
  );
};
