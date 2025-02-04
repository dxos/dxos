//
// Copyright 2024 DXOS.org
//

import React from 'react';
import { useParams } from 'react-router-dom';

import { Button, Icon, type ThemedClassName, Toolbar } from '@dxos/react-ui';
import { mx } from '@dxos/react-ui-theme';

import { CameraButton } from './CameraButton';
import { MicButton } from './MicButton';
import { SelfView } from './SelfView';
import { useSubscribedState, useRoomContext } from '../hooks';

export const Lobby = ({ classNames }: ThemedClassName) => {
  const { roomName } = useParams();
  const { setJoined, userMedia, room, peer } = useRoomContext()!;
  const { videoStreamTrack } = userMedia;
  const session = useSubscribedState(peer.session$);
  const sessionError = useSubscribedState(peer.sessionError$);

  const joinedUsers = new Set(room.otherUsers.filter((user) => user.tracks?.audio).map((u) => u.name)).size;

  return (
    <div className={mx('flex flex-col h-full', classNames)}>
      <div className='flex justify-between px-1 gap-2 items-baseline'>
        <h1 className='text-3xl truncate'>{roomName}</h1>
        <div className='shrink-0 text-sm text-subdued'>{`${joinedUsers} ${joinedUsers === 1 ? 'user' : 'users'}`}</div>
      </div>

      <SelfView className='flex w-full aspect-video object-cover' videoTrack={videoStreamTrack} />

      {sessionError && (
        <div className='p-3 rounded-md text-sm text-zinc-800 bg-red-200 dark:text-zinc-200 dark:bg-red-700'>
          {sessionError}
        </div>
      )}

      <div className='grow' />
      <div className='flex justify-between overflow-hidden'>
        <Toolbar.Root>
          <Button variant='primary' onClick={() => setJoined(true)} disabled={!session?.sessionId}>
            <Icon icon={'ph--phone-incoming--regular'} />
          </Button>
          <div className='grow'></div>
          <MicButton />
          <CameraButton />
        </Toolbar.Root>
      </div>
    </div>
  );
};
