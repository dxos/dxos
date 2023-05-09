//
// Copyright 2023 DXOS.org
//

import { CaretLeft, CaretRight } from '@phosphor-icons/react';
import React, { useEffect } from 'react';
import { createMemoryRouter, Outlet, RouterProvider, useNavigate } from 'react-router-dom';

import { Button } from '@dxos/aurora';
import { Generator } from '@dxos/kai-types/testing';
import { PublicKey, useSpace, useSpaces } from '@dxos/react-client';

import {
  Action,
  AppContextProvider,
  createActionReducer,
  Plugin,
  Surface,
  useActionDispatch,
  usePluginState
} from './framework';
import { CounterPlugin, DebugPlugin, SpacesPlugin, StackPlugin } from './plugins';

// Issues:
// - TODO(burdon): App and Plugin lifecycle.
// - TODO(burdon): State management (access indexed app state). How does a plugin get state?
// - TODO(burdon): Map route to Surfaces and Surface to plugin.
// - TODO(burdon): Actions dispatch (bubbling). Contracts/type-safety.
// - TODO(burdon): Stack plugin: contract to section components from plugins.

/**
 * Goals
 * - Don't use React router navigate directly.
 * - Update app state from router.
 * - Update surfaces bases on app state.
 */

/*
export type RouteAdapter<T> = {
  paramsToState: (params: any) => T;
  stateToPath: (state?: T) => string;
};

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
*/

type AppState = {
  // TODO(burdon): Map to actual objects (create test space/objects)?
  // space: Space;
  // object?: TypedObject;

  spaceKey?: PublicKey;
  objectId?: string;
  counter?: number;
};

type NavAction = Action & {
  type: 'navigate';
  spaceKey?: PublicKey;
  objectId?: string;
};

type AppAction = NavAction;

// TODO(burdon): Root nav-only component.
// TODO(burdon): See AppContainer (Sidebar, etc.)
export const AppRoot = () => {
  // TODO(burdon): Create action.
  const spaces = useSpaces();
  useEffect(() => {
    const generator = new Generator(spaces[0].db);
    void generator.generate();
  }, [spaces]);

  // TODO(burdon): Not updated.
  const navigate = useNavigate();
  const { spaceKey, objectId } = usePluginState(AppPlugin) ?? {};
  useEffect(() => {
    navigate('/' + [spaceKey?.toHex(), objectId].filter(Boolean).join('/'));
  }, [spaceKey]);

  return (
    <div className='flex flex-col grow overflow-hidden'>
      <div className='flex shrink-0 p-4 bg-zinc-200'>
        <Header />
      </div>

      <main className='flex flex-col grow p-4'>
        <Outlet />
      </main>

      <div className='flex flex-col shrink-0 p-4 bg-zinc-200'>
        <Surface plugin='org.dxos.counter' component='main' />
        <Surface plugin='org.dxos.debug' component='main' />
      </div>
    </div>
  );
};

class AppPlugin extends Plugin<AppState, AppAction> {
  constructor() {
    super({
      id: 'com.example.test',
      components: {
        main: AppRoot
      },
      reducer: createActionReducer<AppState, AppAction>({
        navigate: (state, { spaceKey, objectId }) => {
          return { ...state, spaceKey, objectId };
        }
      })
    });
  }
}

//
//
//

export const TestApp = () => {
  // Use natural routes to configure surfaces
  const router = createMemoryRouter([
    {
      path: '/',
      element: <Surface plugin='com.example.test' component='main' />,
      children: [
        {
          path: '/',
          element: <Surface plugin='org.dxos.spaces' component='main' />
        },
        {
          path: '/:spaceKey',
          element: <SpaceContainer />,
          children: [
            {
              path: '/:spaceKey/:objectId'
            }
          ]
        }
      ]
    }
  ]);

  return (
    <AppContextProvider
      // prettier-ignore
      plugins={[
        new AppPlugin(),
        new CounterPlugin(),
        new DebugPlugin(),
        new SpacesPlugin(),
        new StackPlugin()
      ]}
    >
      <RouterProvider router={router} fallbackElement={<div>FALLBACK</div>} />
    </AppContextProvider>
  );
};

//
// Components
//

export const Header = () => {
  const navigate = useNavigate();
  const dispatch = useActionDispatch();
  const spaces = useSpaces();
  const space = spaces[0];

  return (
    <nav className='flex grow justify-between'>
      {/* Action. */}
      <div className='flex space-x-2'>
        <Button onClick={() => dispatch({ type: 'navigate' })}>Home</Button>
        <Button onClick={() => dispatch({ type: 'navigate', spaceKey: space.key })}>Space</Button>
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
  const { spaceKey, objectId } = usePluginState(AppPlugin);
  const space = useSpace(spaceKey);
  const object = objectId ? space?.db.getObjectById(objectId) : undefined;

  return (
    <div>
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
      </div>

      {object && <Surface plugin='org.dxos.stack' data={{ object }} />}
    </div>
  );
};
