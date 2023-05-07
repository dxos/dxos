//
// Copyright 2023 DXOS.org
//

import React from 'react';
import { createMemoryRouter, Link, Outlet, RouterProvider, useParams } from 'react-router-dom';

import { ThemeProvider } from '@dxos/aurora';
import { FullscreenDecorator } from '@dxos/kai-frames';
import { PublicKey } from '@dxos/keys';
import { appkitTranslations } from '@dxos/react-appkit';
import { ClientSpaceDecorator } from '@dxos/react-client/testing';
import { osTranslations } from '@dxos/react-shell';

import { AppContainer } from './components';
import { AppContextProvider, Surface } from './framework';
import { DebugPlugin, StackPlugin } from './plugins';

import '@dxosTheme';

// prettier-ignore
const state = {
  // TODO(burdon): Plugin?
  '.router': {
    state: {
      spaceKey: PublicKey
    }
  },
  [StackPlugin.id]: {
    counter: 0
  }
};

const StoryRoot = () => (
  <ThemeProvider rootDensity='fine' resourceExtensions={[osTranslations, appkitTranslations]}>
    <AppContextProvider initialState={state} reducer={(s) => s}>
      <div className='flex w-full p-2 bg-zinc-200'>
        <Link to={'/home'}>Home</Link>
      </div>
      <div className='flex grow p-2'>
        <Outlet />
      </div>
    </AppContextProvider>
  </ThemeProvider>
);

// Notes
// - root app context that manages global app state
// - natural use of routes, which configure surfaces based on route params
// -

// TODO(burdon): Map path to app state.
type State = {
  spaceKey?: PublicKey;
  objectId?: string;
};

const mapRouteParams = (): State => {
  const { spaceKey: _spaceKey, objectId } = useParams();
  const spaceKey = PublicKey.from(_spaceKey as string);
  return { spaceKey, objectId };
};

// TODO(burdon): Configure surfaces: binding to plugins. Define.

const StoryApp = () => {
  const router = createMemoryRouter([
    {
      path: '/',
      element: <StoryRoot />,
      children: [
        {
          path: '/home',
          element: <Surface id='home' element={<Link to={`/space/${PublicKey.random().toHex()}`}>GO</Link>} />
        },
        {
          path: '/space/:spaceKey',
          element: <Surface id='space' element={<AppContainer />} />,
          children: [
            {
              path: '/space/:spaceKey/:objectId',
              element: <Surface id='type' element={<AppContainer />} plugins={[DebugPlugin, StackPlugin]} />
            }
          ]
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
