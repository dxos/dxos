//
// Copyright 2022 DXOS.org
//

import React, { useEffect } from 'react';
import { generatePath, Navigate, Outlet, useParams } from 'react-router-dom';

import { PublicKey, useClient } from '@dxos/react-client';
import { useSpace, useSpaces } from '@dxos/react-client/echo';

import { SpaceList } from './SpaceList';

export const Main = () => {
  const { spaceKey } = useParams();

  const client = useClient();
  const space = useSpace(PublicKey.safeFrom(spaceKey ?? ''));
  const spaces = useSpaces();

  useEffect(() => {
    const handleKeyDown = async (event: KeyboardEvent) => {
      const modifier = event.ctrlKey || event.metaKey;
      if (event.key === '.' && event.shiftKey && modifier) {
        await client.shell.open();
      } else if (space && event.key === '.' && modifier) {
        await client.shell.shareSpace({ spaceKey: space.key });
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [client, space]);

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
