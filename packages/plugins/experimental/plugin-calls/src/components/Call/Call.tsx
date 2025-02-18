//
// Copyright 2024 DXOS.org
//

import React, { type FC, useEffect, useState } from 'react';
import { useMount } from 'react-use';

import { Button, Icon, Toolbar, type ThemedClassName } from '@dxos/react-ui';
import { mx } from '@dxos/react-ui-theme';
import { nonNullable } from '@dxos/util';

import { PullAudioTracks } from './PullAudioTracks';
import { Transcription } from './Transcription';
import { useRoomContext, useBroadcastStatus } from '../../hooks';
import { ParticipantsLayout } from '../Participant';
import { CameraButton, MicButton, ScreenshareButton, TranscriptionButton } from '../Video';

// TODO(burdon): Factor out.
export const useDebugEnabled = () => {
  const [enabled, setEnabled] = useState(false);
  useEffect(() => {
    const handler = (ev: KeyboardEvent) => {
      if (ev.key.toLowerCase() === 'd' && ev.ctrlKey) {
        ev.preventDefault();
        setEnabled(!enabled);
      }
    };

    document.addEventListener('keypress', handler);
    return () => {
      document.removeEventListener('keypress', handler);
    };
  }, [enabled]);

  return enabled;
};

export const Call: FC<ThemedClassName> = ({ classNames }) => {
  const debugEnabled = useDebugEnabled();
  const {
    space,
    userMedia,
    peer,
    isSpeaking,
    pushedTracks,
    setJoined,
    room: { otherUsers, updateUserState, identity, ai },
  } = useRoomContext()!;

  useMount(() => {
    // TODO(burdon): ???
    if (otherUsers.length > 5) {
      userMedia.turnMicOff();
    }
  });

  useBroadcastStatus({ userMedia, peer, updateUserState, identity, pushedTracks, ai, speaking: isSpeaking });

  return (
    <PullAudioTracks audioTracks={otherUsers.map((user) => user.tracks?.audio).filter(nonNullable)}>
      {ai.transcription.enabled && (
        <Transcription space={space} userMedia={userMedia} identity={identity} ai={ai} isSpeaking={isSpeaking} />
      )}
      <div className={mx('flex flex-col grow overflow-hidden', classNames)}>
        <div className='flex flex-col h-full overflow-y-scroll'>
          <ParticipantsLayout identity={identity} users={otherUsers} debugEnabled={debugEnabled} />
        </div>

        <Toolbar.Root>
          <Button
            variant='destructive'
            onClick={() => {
              userMedia.turnScreenShareOff();
              userMedia.turnMicOff();
              setJoined(false);
            }}
          >
            <Icon icon={'ph--phone-x--regular'} />
          </Button>
          <div className='grow'></div>
          <TranscriptionButton />
          <ScreenshareButton />
          <MicButton />
          <CameraButton />
        </Toolbar.Root>
      </div>
    </PullAudioTracks>
  );
};

Call.displayName = 'Call';
