//
// Copyright 2024 DXOS.org
//

import React, { type FC } from 'react';

import { Button, Icon, IconButton, type ThemedClassName, Toolbar } from '@dxos/react-ui';
import { mx } from '@dxos/react-ui-theme';

import { useSubscribedState, useRoomContext, useHandleMic, useHandleCamera } from '../../hooks';

export const Lobby: FC<ThemedClassName> = ({ classNames }) => {
  const {
    setJoined,
    // userMedia: { videoTrack, videoEnabled },
    room,
    peer,
  } = useRoomContext()!;
  const session = useSubscribedState(peer.session$);
  const sessionError = useSubscribedState(peer.sessionError$);
  const numUsers = new Set(room.otherUsers.filter((user) => user.tracks?.audio).map((user) => user.name)).size;

  const micProps = useHandleMic();
  const cameraProps = useHandleCamera();

  return (
    <div className={mx('flex flex-col grow overflow-auto', classNames)}>
      <div className='flex justify-between'>
        <Toolbar.Root>
          <Button variant='primary' onClick={() => setJoined(true)} disabled={!session?.sessionId}>
            <Icon icon={'ph--phone-incoming--regular'} />
          </Button>
          <div className='grow text-sm text-subdued'>
            {sessionError ?? `${numUsers} ${numUsers === 1 ? 'participant' : 'participants'}`}
          </div>
          <IconButton {...micProps} iconOnly />
          <IconButton {...cameraProps} iconOnly />
        </Toolbar.Root>
      </div>
      {/* {videoEnabled && (
        <>
          <VideoObject className='scale-x-[-1] overflow-auto' videoTrack={videoTrack} muted />
        </>
      )} */}
    </div>
  );
};

Lobby.displayName = 'Lobby';
