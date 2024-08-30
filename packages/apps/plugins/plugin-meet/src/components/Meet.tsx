//
// Copyright 2023 DXOS.org
//

import React from 'react';

import { type LayoutCoordinate } from '@dxos/app-framework';
import { User } from '@phosphor-icons/react';
import { mx } from '@dxos/react-ui-theme';
import type { MeetingRoomType } from '../types';
import { useMeetModel } from '../core';

const Meet = ({ room, role }: { room: MeetingRoomType; role?: string; coordinate?: LayoutCoordinate }) => {
  const model = useMeetModel(room);
  return (
    <div role='none' className={mx(role === 'section' && 'aspect-square', role === 'article' && 'row-span-2')}>
      <h1>{room.name ?? 'Unnamed'} meeting room.</h1>
      <ul>
        {model.state.participants.map((participant) => (
          <li>
            <User />
            <span>{participant.name}</span>
          </li>
        ))}
      </ul>
      <div>
        {model.state.isJoined ? (
          <button onClick={() => model.leave()}>Leave</button>
        ) : (
          <button onClick={() => model.join()}>Join</button>
        )}
      </div>
    </div>
  );
};

export default Meet;
