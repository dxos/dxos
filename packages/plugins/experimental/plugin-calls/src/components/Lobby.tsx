//
// Copyright 2024 DXOS.org
//

import React from 'react';
import { useParams } from 'react-router-dom';

import { Button } from '@dxos/react-ui';

import { CameraButton } from './CameraButton';
import { MicButton } from './MicButton';
import { SelfView } from './SelfView';
import { useSubscribedState } from './hooks/rxjsHooks';
import { useRoomContext } from './hooks/useRoomContext';

export const Lobby: React.FC = () => {
  const { roomName } = useParams();
  const { setJoined, userMedia, room, peer } = useRoomContext()!;
  const { videoStreamTrack } = userMedia;
  const session = useSubscribedState(peer.session$);
  const sessionError = useSubscribedState(peer.sessionError$);

  const joinedUsers = new Set(room.otherUsers.filter((u) => u.tracks?.audio).map((u) => u.name)).size;

  return (
    <div className='flex flex-col items-center justify-center h-full p-4'>
      <div className='flex-1' />
      <div className='space-y-4 w-96'>
        <div>
          <h1 className='text-3xl font-bold'>{roomName}</h1>
          <p className='text-sm text-zinc-500 dark:text-zinc-400'>
            {`${joinedUsers} ${joinedUsers === 1 ? 'user' : 'users'} in the room.`}{' '}
          </p>
        </div>
        <div className='relative'>
          <SelfView className='aspect-[4/3] w-full' videoTrack={videoStreamTrack} />
        </div>
        {sessionError && (
          <div className='p-3 rounded-md text-sm text-zinc-800 bg-red-200 dark:text-zinc-200 dark:bg-red-700'>
            {sessionError}
          </div>
        )}

        <div className='flex gap-4 text-sm'>
          <Button variant='primary' onClick={() => setJoined(true)} disabled={!session?.sessionId}>
            Join
          </Button>
          <MicButton />
          <CameraButton />
        </div>
      </div>
      <div className='flex-1' />
    </div>
  );
};
