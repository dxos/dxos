//
// Copyright 2023 DXOS.org
//

import React from 'react';
import { RouterProvider, createMemoryRouter } from 'react-router-dom';

import { Surface } from './framework';
import { SplitViewPlugin } from './plugins/SplitViewPlugin';
import { RouterActions } from './Actions';
import { ListViewPlugin } from './plugins/ListViewPlugin';

const router = createMemoryRouter([
  {
    path: '/',
    element: (
      <Surface<RouterActions>
        plugins={[SplitViewPlugin, ListViewPlugin]}
        component='SplitViewPlugin.SplitView'
        surfaces={{
          sidebar: {
            component: 'ListViewPlugin.ListView'
          }
        }}
        actions={{
          navigate: ({ to }) => ({
            effects: [() => router.navigate(to)]
          })
        }}
      />
    )
  }
]);

export const TestApp = () => {
  return <RouterProvider router={router} fallbackElement={<div>FALLBACK</div>} />;
};
