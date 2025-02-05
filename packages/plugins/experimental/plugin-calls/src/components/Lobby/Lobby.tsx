//
// Copyright 2024 DXOS.org
//

import React, { type FC } from 'react';

import { Button, Icon, type ThemedClassName, Toolbar } from '@dxos/react-ui';
import { mx } from '@dxos/react-ui-theme';

import { useSubscribedState, useRoomContext } from '../../hooks';
import { CameraButton, MicButton, VideoObject } from '../Video';

export const Lobby: FC<ThemedClassName> = ({ classNames }) => {
  const {
    setJoined,
    userMedia: { videoTrack },
    room,
    peer,
  } = useRoomContext()!;
  const session = useSubscribedState(peer.session$);
  const sessionError = useSubscribedState(peer.sessionError$);
  const numUsers = new Set(room.otherUsers.filter((user) => user.tracks?.audio).map((user) => user.name)).size;

  return (
    <div className={mx('flex flex-col grow overflow-hidden', classNames)}>
      <VideoObject videoTrack={videoTrack} muted />

      <div className='grow' />
      <div className='flex justify-between overflow-hidden'>
        <Toolbar.Root>
          <Button variant='primary' onClick={() => setJoined(true)} disabled={!session?.sessionId}>
            <Icon icon={'ph--phone-incoming--regular'} />
          </Button>
          <div className='grow text-sm text-subdued'>
            {sessionError ?? `${numUsers} ${numUsers === 1 ? 'participant' : 'participants'}`}
          </div>
          <MicButton />
          <CameraButton />
        </Toolbar.Root>
      </div>
    </div>
  );
};

Lobby.displayName = 'Lobby';
