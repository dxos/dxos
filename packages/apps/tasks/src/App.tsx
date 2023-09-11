//
// Copyright 2023 DXOS.org
//

import React from 'react';
import {
  Navigate,
  RouterProvider,
  createBrowserRouter,
  useNavigate,
  useParams,
  useSearchParams,
} from 'react-router-dom';

import { ClientProvider, Config, Dynamics, Local, Defaults } from '@dxos/react-client';
import { useSpace, useQuery } from '@dxos/react-client/echo';
import { Invitation, InvitationEncoder } from '@dxos/react-client/invitations';

import { TaskList } from './TaskList';
import { Task } from './proto';

// Dynamics allows configuration to be supplied by the hosting KUBE.
const config = async () => new Config(await Dynamics(), Local(), Defaults());

export const Home = () => {
  const space = useSpace();
  return space ? <Navigate to={`/space/${space.key}`} /> : null;
};

export const SpaceTaskList = () => {
  const { spaceKey } = useParams<{ spaceKey: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  const space = useSpace(spaceKey);

  const tasks = useQuery<Task>(space, Task.filter());

  // useEffect(() => {
  //   const searchParams = new URLSearchParams(location.search);
  //   const code = searchParams.get('spaceInviteCode');
  //   if (code) {
  //     const receivedInvitation = InvitationEncoder.decode(code);
  //     const invitationObservable = client.acceptInvitation(receivedInvitation);
  //     invitationObservable.subscribe((invitation) => {
  //       if (invitation.state === Invitation.State.SUCCESS) {
  //         setSpaceKey(invitation.spaceKey);
  //       }
  //       searchParams.delete('spaceInviteCode');
  //       window.location.search = searchParams.toString();
  //     });
  //   }
  // }, []);

  return (
    <TaskList
      tasks={tasks}
      onInviteClick={async () => {
        if (!space) {
          return;
        }
        const invitationObservable = space.createInvitation({ authMethod: Invitation.AuthMethod.NONE });
        const encodedInvitation = InvitationEncoder.encode(invitationObservable.get());
        // get the current URL from the window
        const currentUrl = new URL(window.location.href);
        const inviteUrl = `${currentUrl}?spaceInviteCode=${encodedInvitation}`;
        // copy the invite URL to the clipboard
        await navigator.clipboard.writeText(inviteUrl);
      }}
      onTaskCreate={(newTaskTitle) => {
        const task = new Task({ title: newTaskTitle, completed: false });
        space?.db.add(task);
      }}
    />
  );
};

const router = createBrowserRouter([
  {
    path: '/',
    element: <Home />,
  },
  {
    path: '/space/:spaceKey',
    element: <SpaceTaskList />,
  },
]);

export const App = () => {
  return (
    <ClientProvider
      config={config}
      // onInitialized={async (client) => {
      //   const searchParams = new URLSearchParams(location.search);
      //   if (!client.halo.identity.get() && !searchParams.has('deviceInvitationCode')) {
      //     await client.halo.createIdentity();
      //   }
      // }}
    >
      <RouterProvider router={router} />
    </ClientProvider>
  );
};
