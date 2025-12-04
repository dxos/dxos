//
// Copyright 2022 DXOS.org
//

import React, { useEffect } from 'react';
import { Navigate, Outlet, generatePath, useParams } from 'react-router-dom';

import { useClient } from '@dxos/react-client';
import { parseId, useSpace, useSpaces } from '@dxos/react-client/echo';

import { SpaceList } from './SpaceList';

export const Main = () => {
  const { spaceParam } = useParams();
  const client = useClient();
  const spaces = useSpaces();
  const { spaceId } = parseId(spaceParam);
  const space = useSpace(spaceId);

  useEffect(() => {
    const handleKeyDown = async (event: KeyboardEvent) => {
      const modifier = event.ctrlKey || event.metaKey;
      if (event.key === '.' && event.shiftKey && modifier) {
        await client.shell.open();
      } else if (space && event.key === '.' && modifier) {
        await client.shell.shareSpace({ spaceId: space.id });
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [client, space]);

  if (!spaceId && spaces.length > 0) {
    return <Navigate to={generatePath('/:spaceId', { spaceId: spaces[0].id })} />;
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
