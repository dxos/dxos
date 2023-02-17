//
// Copyright 2022 DXOS.org
//

import React, { useEffect } from 'react';
import { Outlet, useNavigate, useParams } from 'react-router-dom';

import { IFrameClientServicesProxy, ShellLayout } from '@dxos/client';
import { useClient, useCurrentSpace, useIdentity, useSpaces } from '@dxos/react-client';

import { Header } from './Header';

const useNavigator = () => {
  const client = useClient();
  const identity = useIdentity();
  const spaces = useSpaces();
  const [space, setSpace] = useCurrentSpace();
  const { spaceKey } = useParams();
  const navigate = useNavigate();

  // Navigate to selected spaces.
  useEffect(() => {
    if (!identity) {
      return;
    }

    const timeout = setTimeout(async () => {
      if (spaces.length === 0) {
        const space = await client.echo.createSpace();
        setSpace(space);
        navigate(`/${space.key.toHex()}`);
      } else if (!space) {
        setSpace(spaces[0]);
        navigate(`/${spaces[0].key.toHex()}`);
      } else if (space && space.key.toHex() !== spaceKey) {
        navigate(`/${space.key.toHex()}`);
      }
    });

    return () => clearTimeout(timeout);
  }, [identity, space]);
};

export const Layout = () => {
  useNavigator();
  const client = useClient();
  const [space] = useCurrentSpace();

  const handleOpen = () => {
    if (client.services instanceof IFrameClientServicesProxy) {
      void client.services.setLayout(ShellLayout.CURRENT_SPACE, { spaceKey: space?.key });
    }
  };

  return (
    <>
      {/* TODO(wittjosiah): Make DXOS button. */}
      <button id='open' onClick={handleOpen} data-testid='open-button'>
        ❯
      </button>
      {/* TODO(wittjosiah): Remove this condition once useQuery supports undefined spaces. */}
      <section className='todoapp'>{space ? <Outlet context={{ space }} /> : <Header />}</section>
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
