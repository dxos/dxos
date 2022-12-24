//
// Copyright 2022 DXOS.org
//

import React, { useEffect, useState } from 'react';
import { HashRouter, useNavigate, useParams, useRoutes } from 'react-router-dom';

import { Client, fromHost } from '@dxos/client';
import { Config } from '@dxos/config';
import { EchoDatabase } from '@dxos/echo-db2';
import { ClientProvider, useClient, useSpaces } from '@dxos/react-client';

import { SpaceContext, SpaceContextType } from '../hooks';
import { Main } from './Main';

/**
 *
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
 *
 */
const Join = () => {
  const navigate = useNavigate();
  const { invitation } = useParams();
  useEffect(() => {
    navigate('/');
  }, []);

  return null;
};

/**
 *
 */
const Home = () => {
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
 *
 */
const Routes = () => {
  return useRoutes([
    {
      path: '/',
      element: <Init />
    },
    {
      path: '/:spaceKey',
      element: <Home />
    },
    {
      path: '/join/:invitation',
      element: <Join />
    }
  ]);
};

/**
 *
 */
export const App = () => {
  const [client, setClient] = useState<Client | undefined>(undefined);
  const x = useState<DatabaseContextState>();

  useEffect(() => {
    setTimeout(async () => {
      const client = new Client({
        // services: fromHost(new Config(await Dynamics(), Defaults()))
        services: fromHost(new Config())
      });

      await client.initialize();
      // TODO(burdon): Hangs if profile not created.
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

/*
  let spaceKey: PublicKey | undefined;
  let swarmKey: PublicKey | undefined;
  try {
    const locationHash = location.hash;
    if (locationHash) {
      const [spaceKeyHex, swarmKeyHex] = locationHash.slice(1).split(':');
      spaceKey = PublicKey.from(spaceKeyHex);
      if (swarmKeyHex) {
        swarmKey = PublicKey.from(swarmKeyHex);
      }
    }
  } catch {}

  const initWithSpace = (space: Space) => {
    const swarmKey = PublicKey.random();
    const hostObservable = space.createInvitation({
      swarmKey,
      type: Invitation.Type.MULTIUSE_TESTING
    });
    hostObservable.subscribe({
      onConnecting: () => {},
      onConnected: () => {},
      onSuccess: (invitation) => {},
      onError: (error) => {
        console.error(error);
      }
    });
    location.hash = `${space.key.toHex()}:${swarmKey.toHex()}`;
    setClient(client);
    setSpaceKey(space.key);
    setDatabase(new EchoDatabase(space.database));
  };

  const join = async (swarmKey: PublicKey): Promise<boolean> => {
    const complete = new Trigger<boolean>();
    const observable = client.echo.acceptInvitation({
      swarmKey,
      type: Invitation.Type.MULTIUSE_TESTING,
      timeout: 2000, // TODO(dmaretskyi): Doesn't work.
      invitationId: PublicKey.random().toHex() // TODO(dmaretskyi): Why is this required?
    });

    observable.subscribe({
      onSuccess: async (invitation) => {
        const space = client.echo.getSpace(spaceKey!)!;
        initWithSpace(space);
        complete.wake(true);
      },
      onTimeout: () => {
        console.error('timeout');
        complete.wake(false);
      },
      onError: (error) => {
        console.error(error);
        complete.wake(false);
      }
    });

    // TODO(burdon): Remove timeout.
    try {
      return await complete.wait({ timeout: 10_000 });
    } catch {
      console.error('timeout');
      void observable.cancel();
      return false;
    }
  };

  if (spaceKey) {
    {
      const space = client.echo.getSpace(spaceKey);
      if (space) {
        initWithSpace(space);
        return;
      }
    }

    if (swarmKey) {
      const success = await join(swarmKey);
      if (success) {
        return;
      }
    }
  }

  const space = await client.echo.createSpace();
  initWithSpace(space);
*/
