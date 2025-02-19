//
// Copyright 2024 DXOS.org
//

import React, { type FC } from 'react';

import { IconButton, type ThemedClassName, Toolbar } from '@dxos/react-ui';
import { mx } from '@dxos/react-ui-theme';

import { useSubscribedState, useRoomContext } from '../../hooks';
import { MediaButtons, VideoObject } from '../Media';

export const Lobby: FC<ThemedClassName> = ({ classNames }) => {
  const { setJoined, userMedia, room, peer } = useRoomContext()!;
  const session = useSubscribedState(peer.session$);
  const sessionError = useSubscribedState(peer.sessionError$);
  const numUsers = new Set(room.otherUsers.filter((user) => user.tracks?.audio).map((user) => user.name)).size;

  return (
    <div className={mx('flex flex-col grow overflow-auto', classNames)}>
      <VideoObject className='scale-x-[-1] object-contain' videoTrack={userMedia.videoTrack} muted />
      <div className='grow' />
      <div className='flex justify-between overflow-hidden'>
        <Toolbar.Root>
          <IconButton
            variant='primary'
            label='Join'
            onClick={() => setJoined(true)}
            disabled={!session?.sessionId}
            icon='ph--phone-incoming--regular'
          />
          <div className='grow text-sm text-subdued'>
            {sessionError ?? `${numUsers} ${numUsers === 1 ? 'participant' : 'participants'}`}
          </div>
          <MediaButtons userMedia={userMedia} />
        </Toolbar.Root>
      </div>
    </div>
  );
};

Lobby.displayName = 'Lobby';
