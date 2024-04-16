//
// Copyright 2022 DXOS.org
//

import cx from 'classnames';
import React, { useCallback } from 'react';
import { useNavigate, Link, generatePath } from 'react-router-dom';

import { create } from '@dxos/echo-schema';
import { useClient } from '@dxos/react-client';
import { type Space, useSpaces } from '@dxos/react-client/echo';
import { humanize } from '@dxos/util';

import { TodoListType } from '../types';

export const SpaceList = ({ current }: { current?: Space }) => {
  const client = useClient();
  const spaces = useSpaces();
  const navigate = useNavigate();

  const handleJoin = async () => {
    const { space } = await client.shell.joinSpace();
    space && navigate(generatePath('/:spaceKey', { spaceKey: space.key.toHex() }));
  };

  const handleCreateList = useCallback(async () => {
    const space = await client.spaces.create();
    await space.db.add(create(TodoListType, { todos: [] }));
    navigate(generatePath('/:spaceKey', { spaceKey: space.key.toHex() }));
  }, [client, navigate]);

  return (
    <div id='spaces'>
      <div className='flex'>
        <h2>Spaces</h2>
        <div className='flex-grow'></div>
        <button onClick={handleCreateList} data-testid='add-button'>
          +
        </button>
        <button
          onClick={() => current && client.shell.shareSpace({ spaceKey: current.key })}
          data-testid='share-button'
        >
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
