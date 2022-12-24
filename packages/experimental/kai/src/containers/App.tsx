//
// Copyright 2022 DXOS.org
//

import React, { useEffect, useState } from 'react';
import { HashRouter, useNavigate, useParams, useRoutes } from 'react-router-dom';

import { Trigger } from '@dxos/async';
import { Client, Invitation, fromHost, PublicKey, Space, InvitationEncoder } from '@dxos/client';
import { Config, Defaults } from '@dxos/config';
import { EchoDatabase } from '@dxos/echo-db2';
import { ClientProvider, useClient, useSpaces } from '@dxos/react-client';

import { SpaceContext, SpaceContextType } from '../hooks';
import { Main } from './Main';

/**
 * Selects or creates an initial space.
 */
const Init = () => {
  const navigate = useNavigate();
  const client = useClient();
  const spaces = useSpaces();
  const [init, setInit] = useState(false);

  useEffect(() => {
    if (init) {
      return;
    }

    if (spaces.length) {
      navigate('/' + spaces[0].key.truncate());
    } else {
      setInit(true); // Make idempotent.
      setTimeout(async () => {
        const space = await client.echo.createSpace();
        navigate('/' + space.key.truncate());
      });
    }
  }, [spaces, init]);

  return null;
};

/**
 * Join space via invitation URL.
 */
const Join = () => {
  const client = useClient();
  const navigate = useNavigate();
  const { invitation: invitationCode } = useParams();
  useEffect(() => {
    const invitation = InvitationEncoder.decode(invitationCode!);

    const complete = new Trigger<Space | null>();
    const observable = client.echo.acceptInvitation({
      invitationId: PublicKey.random().toHex(), // TODO(dmaretskyi): Why is this required?
      swarmKey: invitation.swarmKey,
      type: Invitation.Type.MULTIUSE_TESTING,
      timeout: 2000 // TODO(dmaretskyi): Doesn't work.
    });

    // TODO(burdon): Error page.
    const unsubscribe = observable.subscribe({
      onSuccess: async () => {
        // TODO(burdon): Space key missing from returned invitation.
        navigate(`/${invitation.spaceKey!.truncate()}`);
      },
      onTimeout: () => {
        console.error('timeout');
        complete.wake(null);
      },
      onError: (error) => {
        console.error(error);
        complete.wake(null);
      }
    });

    return () => {
      unsubscribe();
      void observable.cancel();
    };
  }, [invitationCode]);

  return null;
};

/**
 * Home page with current space.
 */
const SpacePage = () => {
  const navigate = useNavigate();
  const { spaceKey: currentSpaceKey } = useParams();
  const spaces = useSpaces();
  const [context, setContext] = useState<SpaceContextType | undefined>();

  useEffect(() => {
    if (!spaces.length) {
      navigate('/');
      return;
    }

    const space = spaces.find((space) => space.key.truncate() === currentSpaceKey);
    if (space) {
      const database = new EchoDatabase(space.database);
      setContext({ space, database });
    } else {
      navigate('/');
    }
  }, [spaces, currentSpaceKey]);

  if (!context) {
    return null;
  }

  return (
    <SpaceContext.Provider value={context}>
      <Main />
    </SpaceContext.Provider>
  );
};

/**
 * Main app routes.
 */
const Routes = () => {
  return useRoutes([
    {
      path: '/',
      element: <Init />
    },
    {
      path: '/join/:invitation',
      element: <Join />
    },
    {
      path: '/:spaceKey',
      element: <SpacePage />
    }
  ]);
};

/**
 * Main app container with routes.
 */
export const App = () => {
  const [client, setClient] = useState<Client | undefined>(undefined);

  // Auto-create client and profile.
  useEffect(() => {
    setTimeout(async () => {
      const config = new Config(Defaults());
      const client = new Client({
        services: fromHost(config)
      });

      await client.initialize();
      // TODO(burdon): Hangs (no error) if profile not created?
      if (!client.halo.profile) {
        await client.halo.createProfile();
      }

      setClient(client);
    });
  }, []);

  if (!client) {
    return null;
  }

  return (
    <ClientProvider client={client}>
      <HashRouter>
        <Routes />
      </HashRouter>
    </ClientProvider>
  );
};
