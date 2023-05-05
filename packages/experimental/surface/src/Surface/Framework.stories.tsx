//
// Copyright 2023 DXOS.org
//

import { AppContainer } from 'packages/experimental/surface/src/Surface/components';
import React from 'react';
import { createMemoryRouter, Link, Outlet, RouterProvider } from 'react-router-dom';

import { ThemeProvider } from '@dxos/aurora';
import { FullscreenDecorator } from '@dxos/kai-frames';
import { appkitTranslations } from '@dxos/react-appkit';
import { ClientSpaceDecorator } from '@dxos/react-client/testing';
import { osTranslations } from '@dxos/react-shell';

import { AppContextProvider, Surface } from './framework';

import '@dxosTheme';

const StoryRoot = () => (
  <ThemeProvider rootDensity='fine' resourceExtensions={[osTranslations, appkitTranslations]}>
    <AppContextProvider initialState={{}}>
      <div className='flex w-full p-2 bg-zinc-200'>
        <Link to={'/home'}>Home</Link>
      </div>
      <div className='flex grow p-2'>
        <Outlet />
      </div>
    </AppContextProvider>
  </ThemeProvider>
);

// prettier-ignore
const state = {
  '.router': {
    spaceKey: undefined
  },
  'com.example.test': {
    counter: 0
  }
};

const StoryApp = () => {
  const router = createMemoryRouter([
    {
      path: '/',
      element: <StoryRoot />,
      children: [
        {
          path: '/home',
          element: <Surface id='home' element={<div>HOME</div>} />
        },
        {
          // TODO(burdon): Map path to app state.
          path: '/space/:spaceKey',
          element: (
            <Surface
              id='space'
              element={<AppContainer />}
              plugins={[
                {
                  id: 'com.example.test',
                  reducer: (state: any = {}, action: any) => state
                }
              ]}
            />
          )
        }
      ]
    }
  ]);

  return <RouterProvider router={router} />;
};

export default {
  component: Surface,
  decorators: [FullscreenDecorator('flex-col'), ClientSpaceDecorator()],
  parameters: {
    layout: 'fullscreen'
  }
};

export const Default = {
  render: () => <StoryApp />
};
