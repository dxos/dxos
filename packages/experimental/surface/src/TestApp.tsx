//
// Copyright 2023 DXOS.org
//

import { CaretLeft, CaretRight } from '@phosphor-icons/react';
import React, { useEffect } from 'react';
import { createMemoryRouter, Outlet, RouterProvider, useNavigate } from 'react-router-dom';

import { Button } from '@dxos/aurora';
import { Generator } from '@dxos/kai-types/testing';
import { PublicKey, useSpaces } from '@dxos/react-client';

import {
  AppAction,
  AppContextProvider,
  RouteAdapter,
  Surface,
  useAppNavigate,
  useAppReducer,
  useAppState
} from './framework';
import { DebugPlugin, SettingsPlugin, StackPlugin } from './plugins';

/**
 * Goals
 * - Don't use react router navigate directly.
 * - Update app state from router.
 * - Update surfaces bases on app state.
 */

export type AppState = {
  // TODO(burdon): Map to actual objects (create test space/objects)?
  // space: Space;
  // object?: TypedObject;

  spaceKey?: PublicKey;
  objectId?: string;
  counter?: number;
};

export const TestApp = () => {
  // Use natural routes to configure surfaces
  const router = createMemoryRouter([
    {
      path: '/',
      element: <AppRoot />,
      children: [
        {
          path: '/settings',
          element: <Surface plugin='settings' />
        },
        {
          path: '/:spaceKey',
          element: <SpaceContainer />,
          // TODO(burdon): Use to async load Space? Doesn't seem to work in storybook?
          // https://reactrouter.com/en/main/route/loader
          // loader: ({ params: { spaceKey } }) => {
          //   return { spaceKey: spaceKey ? PublicKey.from(spaceKey) : undefined };
          // }
          children: [
            {
              path: '/:spaceKey/:objectId'
            }
          ]
        }
      ]
    }
  ]);

  const routeAdapter: RouteAdapter<AppState> = {
    paramsToState: ({ spaceKey, objectId }: { spaceKey?: string; objectId?: string }): AppState => {
      return {
        spaceKey: spaceKey ? PublicKey.from(spaceKey) : undefined,
        objectId
      };
    },

    stateToPath: ({ spaceKey, objectId }: AppState = {}): string => {
      return '/' + [spaceKey?.toHex(), objectId].filter(Boolean).join('/');
    }
  };

  const appReducer = (state: AppState, { type }: AppAction): AppState => {
    switch (type) {
      case 'inc': {
        return { ...state, counter: (state.counter || 0) + 1 };
      }
    }

    return state;
  };

  return (
    <AppContextProvider<AppState>
      initialState={{ counter: 0 }}
      // TODO(burdon): Configure plugins (e.g., state mapping).
      // prettier-ignore
      plugins={{
        debug: new DebugPlugin(),
        settings: new SettingsPlugin(),
        stack: new StackPlugin()
      }}
      routeAdapter={routeAdapter}
      reducer={appReducer}
    >
      <RouterProvider router={router} fallbackElement={<div>FALLBACK</div>} />
    </AppContextProvider>
  );
};

//
// Components
//

export const AppRoot = () => {
  const spaces = useSpaces();
  useEffect(() => {
    const generator = new Generator(spaces[0].db);
    void generator.generate();
  }, [spaces]);

  return (
    <div className='flex flex-col grow overflow-hidden'>
      <div className='flex shrink-0 p-4 bg-zinc-200'>
        <Header />
      </div>

      <main className='flex flex-col grow p-4'>
        <Outlet />
      </main>

      <div className='flex shrink-0 p-4 bg-zinc-200'>
        <Surface plugin='debug' component='main' />
      </div>
    </div>
  );
};

export const Header = () => {
  const navigate = useNavigate();
  const appNavigate = useAppNavigate<AppState>();
  const dispatch = useAppReducer();
  const spaces = useSpaces();
  const space = spaces[0];

  return (
    <nav className='flex grow justify-between'>
      {/* Action. */}
      <div className='flex space-x-2'>
        <Button onClick={() => appNavigate()}>Home</Button>
        <Button onClick={() => appNavigate({ spaceKey: space.key })}>Space</Button>
        {/* TODO(burdon): Select object. */}
        <Button onClick={() => appNavigate({ spaceKey: space.key, objectId: '123' })}>Object</Button>
      </div>

      {/* Direct navigation. */}
      <div className='flex space-x-2'>
        <Button onClick={() => dispatch({ type: 'inc' })}>Inc</Button>
        <Button onClick={() => navigate('/settings')}>Settings</Button>
        <Button onClick={() => navigate(-1)}>
          <CaretLeft />
        </Button>
        <Button onClick={() => navigate(1)}>
          <CaretRight />
        </Button>
      </div>
    </nav>
  );
};

export const SpaceContainer = () => {
  const { spaceKey, objectId } = useAppState();
  return (
    <div>
      <h2>SpaceContainer</h2>
      {spaceKey && (
        <div>
          <span>space key</span>
          <pre>{spaceKey.truncate()}</pre>
        </div>
      )}
      {objectId && (
        <div>
          <span>object id</span>
          <pre>{objectId}</pre>
        </div>
      )}

      {/* TODO(burdon): Configure based on object type. */}
      <Surface plugin='stack' />
    </div>
  );
};
