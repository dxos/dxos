//
// Copyright 2024 DXOS.org
//

import React from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import { log } from '@dxos/log';

import { Button } from '../app/components/Button';
import { CameraButton } from '../app/components/CameraButton';
import { MicButton } from '../app/components/MicButton';
import { SelfView } from '../app/components/SelfView';
import { SettingsButton } from '../app/components/SettingsDialog';
import { useSubscribedState } from '../app/hooks/rxjsHooks';
import { useRoomContext } from '../app/hooks/useRoomContext';
import { errorMessageMap } from '../app/hooks/useUserMedia';

export const Lobby: React.FC = () => {
  const { roomName } = useParams();
  const navigate = useNavigate();
  const { setJoined, userMedia, room, peer } = useRoomContext()!;
  const { videoStreamTrack } = userMedia;
  const session = useSubscribedState(peer.session$);
  const sessionError = useSubscribedState(peer.sessionError$);

  const joinedUsers = new Set(room.otherUsers.filter((u) => u.tracks.audio).map((u) => u.name)).size;

  const audioUnavailableMessage = userMedia.audioUnavailableReason
    ? errorMessageMap[userMedia.audioUnavailableReason]
    : null;

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
        {(userMedia.audioUnavailableReason || userMedia.videoUnavailableReason) && (
          <div className='p-3 rounded-md text-sm text-zinc-800 bg-zinc-200 dark:text-zinc-200 dark:bg-zinc-700'>
            {userMedia.audioUnavailableReason === 'NotAllowedError' &&
              userMedia.videoUnavailableReason === undefined && <p>Mic permission was denied.</p>}
            {userMedia.videoUnavailableReason === 'NotAllowedError' &&
              userMedia.audioUnavailableReason === undefined && <p>Camera permission was denied.</p>}
            {userMedia.audioUnavailableReason === 'NotAllowedError' &&
              userMedia.videoUnavailableReason === 'NotAllowedError' && <p>Mic and camera permissions were denied.</p>}
            {userMedia.audioUnavailableReason === 'NotAllowedError' && (
              <p>
                Enable permission
                {userMedia.audioUnavailableReason && userMedia.videoUnavailableReason ? 's' : ''} and reload the page to
                join.
              </p>
            )}
            {userMedia.audioUnavailableReason === 'DevicesExhaustedError' && <p>No working microphone found.</p>}
            {userMedia.videoUnavailableReason === 'DevicesExhaustedError' && <p>No working webcam found.</p>}
            {userMedia.audioUnavailableReason === 'UnknownError' && <p>Unknown microphone error.</p>}
            {userMedia.videoUnavailableReason === 'UnknownError' && <p>Unknown webcam error.</p>}
          </div>
        )}
        <div className='flex gap-4 text-sm'>
          {audioUnavailableMessage ? (
            <Button disabled>Join</Button>
          ) : (
            <Button
              onClick={() => {
                setJoined(true);
                // we navigate here with javascript instead of an a
                // tag because we don't want it to be possible to join
                // the room without the JS having loaded
                log.info('Navigating to room');
                navigate('room');
              }}
              disabled={!session?.sessionId}
            >
              Join
            </Button>
          )}
          <MicButton />
          <CameraButton />
          <SettingsButton />
        </div>
      </div>
      <div className='flex-1' />
    </div>
  );
};
