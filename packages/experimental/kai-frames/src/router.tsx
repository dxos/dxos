//
// Copyright 2022 DXOS.org
//

import React from 'react';
import { Outlet } from 'react-router-dom';

const Root = () => (
  <div className='flex absolute left-0 right-0 top-0 bottom-0 items-center justify-center'>
    <Outlet />
  </div>
);

// TODO(burdon): Showcase: factor out frame list (using metagraph).
const Test = () => <div className='text-6xl'>Labs</div>;

/**
 * Main app routes.
 */
export const routes = [
  {
    path: '/',
    element: <Root />,
    children: [
      {
        path: '/test',
        element: <Test />,
      },
    ],
  },
];
