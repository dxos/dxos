//
// Copyright 2022 DXOS.org
//

import cx from 'classnames';
import React, { useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';

import { IFrameClientServicesHost, IFrameClientServicesProxy, ShellLayout, useClient } from '@dxos/react-client';
import { Space, useSpaces } from '@dxos/react-client/echo';
import { humanize } from '@dxos/util';

import { TodoList } from '../proto';

export const SpaceList = ({ current }: { current?: Space }) => {
  const client = useClient();
  const spaces = useSpaces();
  const navigate = useNavigate();

  const handleOpen = () => {
    if (client.services instanceof IFrameClientServicesProxy || client.services instanceof IFrameClientServicesHost) {
      void client.services.setLayout(ShellLayout.SPACE_INVITATIONS, { spaceKey: current?.key });
    }
  };

  const handleJoin = () => {
    if (client.services instanceof IFrameClientServicesProxy || client.services instanceof IFrameClientServicesHost) {
      void client.services.setLayout(ShellLayout.JOIN_SPACE);
    }
  };

  const handleCreateList = useCallback(async () => {
    const space = await client.createSpace();
    await space.db.add(new TodoList());
    navigate(`/${space.key.toHex()}`);
  }, [client, navigate]);

  return (
    <div id='spaces'>
      <div className='flex'>
        <h2>Spaces</h2>
        <div className='flex-grow'></div>
        <button onClick={handleCreateList} data-testid='add-button'>
          +
        </button>
        <button onClick={handleOpen} data-testid='share-button'>
          ↸
        </button>
        <button id='' onClick={handleJoin} data-testid='join-button'>
          ⇲
        </button>
      </div>
      <ul>
        {spaces.map((space) => {
          const key = space.key.toHex();
          const isSelected = current?.key.equals(space.key);
          return (
            <Link key={key} to={`/${key}`} className={cx(isSelected && 'selected')}>
              <li>{humanize(key)}</li>
            </Link>
          );
        })}
      </ul>
    </div>
  );
};
