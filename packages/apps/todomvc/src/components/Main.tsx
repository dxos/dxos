//
// Copyright 2022 DXOS.org
//

import React, { useEffect } from 'react';
import { generatePath, Navigate, Outlet, useNavigate, useParams } from 'react-router-dom';

import { IFrameClientServicesHost, IFrameClientServicesProxy, PublicKey, useClient } from '@dxos/react-client';
import { useSpace, useSpaces } from '@dxos/react-client/echo';

import { SpaceList } from './SpaceList';

export const Main = () => {
  const navigate = useNavigate();
  const { spaceKey } = useParams();

  const client = useClient();
  const space = useSpace(PublicKey.safeFrom(spaceKey ?? ''));
  const spaces = useSpaces();

  useEffect(() => {
    if (client.services instanceof IFrameClientServicesProxy || client.services instanceof IFrameClientServicesHost) {
      return client.services.joinedSpace.on((spaceKey) =>
        navigate(generatePath('/:spaceKey', { spaceKey: spaceKey.toHex() })),
      );
    }
  }, []);

  useEffect(() => {
    if (client.services instanceof IFrameClientServicesProxy || client.services instanceof IFrameClientServicesHost) {
      client.services.setSpaceProvider(() => space?.key);
    }
  }, [space]);

  if (!spaceKey && spaces.length > 0) {
    return <Navigate to={generatePath('/:spaceKey', { spaceKey: spaces[0].key.toHex() })} />;
  }

  return (
    <>
      <SpaceList current={space} />
      <section className='todoapp'>
        <Outlet context={{ space }} />
      </section>
      <footer className='info'>
        <p>Double-click to edit a todo</p>
        <p>
          Created by <a href='https://github.com/dxos/'>DXOS</a>
        </p>
        <p>
          Based on <a href='https://todomvc.com'>TodoMVC</a>
        </p>
      </footer>
    </>
  );
};
