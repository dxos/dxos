//
// Copyright 2024 DXOS.org
//

import React from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import { Button } from '@dxos/react-ui';

import { CameraButton } from './CameraButton';
import { MicButton } from './MicButton';
import { SelfView } from './SelfView';
import { useSubscribedState, useRoomContext } from './hooks';

export const Lobby = () => {
  const { roomName } = useParams();
  const navigate = useNavigate();
  const { setJoined, userMedia, room, peer } = useRoomContext()!;
  const { videoStreamTrack } = userMedia;
  const session = useSubscribedState(peer.session$);
  const sessionError = useSubscribedState(peer.sessionError$);

  const joinedUsers = new Set(room.otherUsers.filter((user) => user.tracks.audio).map((u) => u.name)).size;

  return (
    <div className='flex flex-col h-full items-center justify-center'>
      <div className='flex-1' />
      <div className='space-y-4 w-96'>
        <div>
          <h1 className='text-3xl font-bold'>{roomName}</h1>
        </div>
        <div className='relative'>
          <SelfView className='aspect-[4/3] w-full' videoTrack={videoStreamTrack} />
        </div>
        {sessionError && (
          <div className='p-3 rounded-md text-sm text-zinc-800 bg-red-200 dark:text-zinc-200 dark:bg-red-700'>
            {sessionError}
          </div>
        )}

        <div className='flex items-center justify-between items-center'>
          <div className='flex items-center gap-2'>
            <Button
              variant='primary'
              onClick={() => {
                setJoined(true);
                // we navigate here with javascript instead of an a
                // tag because we don't want it to be possible to join
                // the room without the JS having loaded
                navigate('room');
              }}
              disabled={!session?.sessionId}
            >
              Join
            </Button>
            <MicButton />
            <CameraButton />
          </div>
          <div className='text-sm'>{`${joinedUsers} ${joinedUsers === 1 ? 'user' : 'users'}`}</div>
        </div>
      </div>
      <div className='flex-1' />
    </div>
  );
};
