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

import { Config, defs } from '@dxos/config';
import { Filter, Obj, Query } from '@dxos/echo';
import { parseId } from '@dxos/keys';
import { ClientProvider, createClientServices, useShell } from '@dxos/react-client';
import { useQuery, useSpace, useSpaces } from '@dxos/react-client/echo';

import { getConfig } from './config';
import { TaskList } from './TaskList';
import { Task } from './types';

export const TaskListContainer = () => {
  const { spaceProp } = useParams<{ spaceProp: string }>();

  const { spaceId } = parseId(spaceProp);
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
  const [space] = useSpaces();
  const shell = useShell();
  const [search, setSearchProps] = useSearchParams();
  const invitationCode = search.get('spaceInvitationCode');
  const deviceInvitationCode = search.get('deviceInvitationCode');
  const navigate = useNavigate();

  useEffect(() => {
    if (deviceInvitationCode) {
      // TODO(wittjosiah): desired API for joining a device.
      // shell.joinDevice({ invitationCode: deviceInvitationCode });
      setSearchProps((p) => {
        p.delete('deviceInvitationCode');
        return p;
      });
    } else if (invitationCode) {
      setSearchProps((p) => {
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
    path: '/space/:spaceProp',
    element: <TaskListContainer />,
  },
  {
    path: '/',
    element: <Home />,
  },
]);

// Dedicated-worker client services. A coordinator SharedWorker elects a single leader tab that owns
// the dedicated Worker hosting the ECHO services; follower tabs proxy through it.
const createServices = (config?: Config) =>
  createClientServices(
    new Config(
      { runtime: { client: { servicesMode: defs.Runtime.Client.ServicesMode.DEDICATED_WORKER } } },
      ...(config ? [config.values] : []),
    ),
    {
      createDedicatedWorker: () =>
        new Worker(new URL('@dxos/client/dedicated-worker', import.meta.url), {
          type: 'module',
          name: 'dxos-client-worker',
        }),
      createCoordinatorWorker: () =>
        new SharedWorker(new URL('@dxos/client/coordinator-worker', import.meta.url), {
          type: 'module',
          name: 'dxos-coordinator-worker',
        }),
    },
  );

export const App = () => {
  // Create a registry instance for atom reactivity
  const registry = useMemo(() => Registry.make(), []);

  return (
    <ClientProvider
      config={getConfig}
      services={createServices}
      shell='./shell.html'
      types={[Task]}
      onInitialized={async (client) => {
        const searchProps = new URLSearchParams(location.search);
        if (!client.halo.identity.get() && !searchProps.has('deviceInvitationCode')) {
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
