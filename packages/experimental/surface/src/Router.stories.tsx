//
// Copyright 2023 DXOS.org
//

import React from 'react';
import { createMemoryRouter, Outlet, RouterProvider, useLocation, useNavigate, useParams } from 'react-router-dom';

import { Button } from '@dxos/aurora';
import { FullscreenDecorator } from '@dxos/kai-frames';
import { PublicKey } from '@dxos/keys';
import { ClientSpaceDecorator } from '@dxos/react-client/testing';

import '@dxosTheme';

import { AppAction, AppContextProvider, useAppReducer, useAppState } from './framework';

type AppState = {
  spaceKey?: PublicKey;
};

// TODO(burdon): useParams => updateAppState.

const mapRouteParams = ({ spaceKey }: { spaceKey: PublicKey }) => {
  return {
    spaceKey: PublicKey.from(spaceKey)
  };
};

const useRouterUpdate = () => {
  const reducer = useAppReducer();
  const { spaceKey } = useParams();
  console.log('useRouterUpdate', spaceKey);
  reducer({ type: 'update', data: { spaceKey: spaceKey ? PublicKey.from(spaceKey) : undefined } });
};

// TODO(burdon): Nav then process.
const appReducer = (state: any, { type, data }: AppAction) => {
  // switch (type) {
  // case 'set-space': {
  //   return state;
  // }
  // }

  // return { ...state, ...data };
  return state;
};

const DebugInfo = () => {
  const location = useLocation();
  const params = useParams();
  const state = useAppState();

  return (
    <div>
      <pre>{JSON.stringify({ router: { location, params }, state }, undefined, 2)}</pre>
    </div>
  );
};

const AppContainer = () => {
  useRouterUpdate();
  const dispatch = useAppReducer();
  const navigate = useNavigate();

  const handleSetSpace = (spaceKey?: PublicKey) => {
    if (!spaceKey) {
      navigate('/'); // TODO(burdon): Dispatch.
    } else {
      dispatch({ type: 'set-space', data: { spaceKey } });
    }
  };

  return (
    <div className='flex flex-col grow overflow-hidden'>
      <div className='flex shrink-0 space-x-2 p-4 bg-zinc-200'>
        <Button onClick={() => handleSetSpace()}>Home</Button>
        <Button onClick={() => handleSetSpace(PublicKey.random())}>Space</Button>
        <Button onClick={() => navigate(`/${PublicKey.random().toHex()}`)}>Go</Button>
        <Button onClick={() => navigate(-1)}>Back</Button>
        <Button onClick={() => navigate(1)}>Forward</Button>
      </div>

      <div className='flex flex-col grow p-4'>
        <Outlet />
      </div>

      <div className='flex flex-col shrink-0 p-4 bg-zinc-200'>
        <DebugInfo />
      </div>
    </div>
  );
};

const SpaceContainer = () => {
  const { spaceKey } = useAppState();
  return <div>[{spaceKey?.truncate()}]</div>;
};

const App = () => {
  const router = createMemoryRouter([
    {
      path: '/',
      element: <AppContainer />,
      children: [
        {
          path: '/:spaceKey',
          element: <SpaceContainer />
        }
      ]
    }
  ]);

  return (
    <AppContextProvider<AppState> reducer={appReducer} initialState={{ spaceKey: undefined }}>
      <RouterProvider router={router} fallbackElement={<div>FALLBACK</div>} />;
    </AppContextProvider>
  );
};

export default {
  component: App,
  decorators: [FullscreenDecorator('flex-col'), ClientSpaceDecorator()],
  parameters: {
    layout: 'fullscreen'
  }
};

export const Default = {
  render: () => <App />
};
