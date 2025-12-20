//
// Copyright 2023 DXOS.org
//

import { RegistryContext } from '@effect-atom/atom-react';
import * as Registry from '@effect-atom/atom/Registry';
import React, { useEffect, useMemo } from 'react';
import {
  Navigate,
  RouterProvider,
  createBrowserRouter,
  useNavigate,
  useParams,
  useSearchParams,
} from 'react-router-dom';

import { Obj } from '@dxos/echo';
import { ClientProvider, useShell } from '@dxos/react-client';
import { Filter, Query, parseId, useQuery, useSpace } from '@dxos/react-client/echo';

import { getConfig } from './config';
import { TaskList } from './TaskList';
import { Task } from './types';

export const TaskListContainer = () => {
  const { spaceParam } = useParams<{ spaceParam: string }>();

  const { spaceId } = parseId(spaceParam);
  const space = useSpace(spaceId);
  const tasks = useQuery(space?.db, Query.select(Filter.type(Task)));
  const shell = useShell();

  return (
    <TaskList
      tasks={tasks}
      onInviteClick={async () => {
        if (!space) {
          return;
        }
        void shell.shareSpace({ spaceKey: space?.key });
        // TODO: desired API to teach shell how to form share URLs
        // void shell.shareSpace({ spaceKey: space?.key, invitationUrl: (invitationCode) => `/space/${space.key}?spaceInvitationCode=${invitationCode}` });
      }}
      onTaskCreate={(newTaskTitle) => {
        const task = Obj.make(Task, { title: newTaskTitle, completed: false });
        space?.db.add(task);
      }}
      onTaskRemove={(task) => {
        space?.db.remove(task);
      }}
    />
  );
};

export const Home = () => {
  const space = useSpace();
  const shell = useShell();
  const [search, setSearchParams] = useSearchParams();
  const invitationCode = search.get('spaceInvitationCode');
  const deviceInvitationCode = search.get('deviceInvitationCode');
  const navigate = useNavigate();

  useEffect(() => {
    if (deviceInvitationCode) {
      // TODO(???): desired API for joining a device.
      // shell.joinDevice({ invitationCode: deviceInvitationCode });
      setSearchParams((p) => {
        p.delete('deviceInvitationCode');
        return p;
      });
    } else if (invitationCode) {
      setSearchParams((p) => {
        p.delete('spaceInvitationCode');
        return p;
      });
      void (async () => {
        const { space } = await shell.joinSpace({ invitationCode });
        if (space) {
          navigate(`/space/${space.id}`);
        }
      })();
    }
  }, [invitationCode, deviceInvitationCode]);

  return space ? <Navigate to={`/space/${space.id}`} /> : null;
};

const router = createBrowserRouter([
  {
    path: '/space/:spaceParam',
    element: <TaskListContainer />,
  },
  {
    path: '/',
    element: <Home />,
  },
]);

const createWorker = () =>
  new SharedWorker(new URL('./shared-worker', import.meta.url), {
    type: 'module',
    name: 'dxos-client-worker',
  });

export const App = () => {
  // Create a registry instance for atom reactivity
  const registry = useMemo(() => Registry.make(), []);

  return (
    <ClientProvider
      config={getConfig}
      createWorker={createWorker}
      shell='./shell.html'
      types={[Task]}
      onInitialized={async (client) => {
        const searchParams = new URLSearchParams(location.search);
        if (!client.halo.identity.get() && !searchParams.has('deviceInvitationCode')) {
          await client.halo.createIdentity();
        }
      }}
    >
      <RegistryContext.Provider value={registry}>
        <RouterProvider router={router} />
      </RegistryContext.Provider>
    </ClientProvider>
  );
};
