//
// Copyright 2024 DXOS.org
//

import { plate } from '@dxos/plate';
import template from '../template.t';

export default template.define.script({
  content: plate/* javascript */ `
  import React, { useEffect } from 'react';
  import {
    Navigate,
    RouterProvider,
    createBrowserRouter,
    useNavigate,
    useParams,
    useSearchParams,
  } from 'react-router-dom';
  
  import { ClientProvider, Config, Dynamics, Local, Defaults, useShell } from '@dxos/react-client';
  import { useSpace, useQuery } from '@dxos/react-client/echo';
  
  import { TaskList } from './TaskList';
  import { Task } from './schema';
  
  const config = async () => new Config(Local(), Defaults());
  
  export const TaskListContainer = () => {
    const { spaceKey } = useParams<{ spaceKey: string }>();
  
    const space = useSpace(spaceKey);
    const tasks = useQuery<Task>(space, Filter.schema(Task));
    const shell = useShell();
  
    return (
      <TaskList
        tasks={tasks}
        onInviteClick={async () => {
          if (!space) {
            return;
          }
          void shell.shareSpace({ spaceKey: space?.key });
        }}
        onTaskCreate={(newTaskTitle) => {
          const task = create(Task, { title: newTaskTitle, completed: false });
          space?.db.add(task);
        }}
        onTaskRemove={(task) => {
          space?.db.remove(task);
        }}
        onTaskTitleChange={(task, newTitle) => {
          task.title = newTitle;
        }}
        onTaskCheck={(task, checked) => {
          task.completed = checked;
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
            navigate(\`/space/\${space.key}\`);
          }
        })();
      }
    }, [invitationCode, deviceInvitationCode]);
  
    return space ? <Navigate to={\`/space/\${space.key}\`} /> : null;
  };
  
  const router = createBrowserRouter([
    {
      path: '/space/:spaceKey',
      element: <TaskListContainer />,
    },
    {
      path: '/',
      element: <Home />,
    },
  ]);
  
  export const App = () => {
    return (
      <ClientProvider
        config={config}
        shell='./shell.html'
        onInitialized={async (client) => {
          client.addSchema(Task);
          const searchParams = new URLSearchParams(location.search);
          if (!client.halo.identity.get() && !searchParams.has('deviceInvitationCode')) {
            await client.halo.createIdentity();
          }
        }}
      >
        <RouterProvider router={router} />
      </ClientProvider>
    );
  };
  `,
});
