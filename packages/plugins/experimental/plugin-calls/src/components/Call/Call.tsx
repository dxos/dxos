//
// Copyright 2024 DXOS.org
//

import React, { type FC, Fragment, useEffect, useState } from 'react';
import { Flipper } from 'react-flip-toolkit';
import { useMount } from 'react-use';

import { Button, Icon, Toolbar, type ThemedClassName } from '@dxos/react-ui';
import { mx } from '@dxos/react-ui-theme';
import { nonNullable } from '@dxos/util';

import { PullAudioTracks } from './PullAudioTracks';
import { PullVideoTrack } from './PullVideoTrack';
import { Transcription } from './Transcription';
import { useRoomContext, useBroadcastStatus, useIsSpeaking } from '../../hooks';
import { Participant } from '../Participant';
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
    dataSaverMode,
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

  const speaking = useIsSpeaking(userMedia.audioTrack);

  useBroadcastStatus({ userMedia, peer, updateUserState, identity, pushedTracks, ai, speaking });
  const [pinnedId, setPinnedId] = useState<string>();
  const totalUsers = 1 + otherUsers.length;

  return (
    <PullAudioTracks audioTracks={otherUsers.map((user) => user.tracks?.audio).filter(nonNullable)}>
      {ai.transcription.enabled && <Transcription space={space} userMedia={userMedia} identity={identity} ai={ai} />}
      <div className={mx('flex flex-col grow overflow-hidden', classNames)}>
        {/* https://github.com/aholachek/react-flip-toolkit */}
        <Flipper flipKey={totalUsers} className='flex flex-col h-full overflow-y-scroll'>
          <div className='flex flex-col gap-1'>
            {identity && userMedia.audioTrack && (
              <Participant
                isSelf
                flipId={identity.id!}
                user={identity}
                videoTrack={userMedia.videoTrack}
                audioTrack={userMedia.audioTrack}
                pinnedId={pinnedId}
                setPinnedId={setPinnedId}
                showDebugInfo={debugEnabled}
              />
            )}

            {userMedia.screenShareEnabled && (
              <Participant
                isScreenShare
                flipId={identity.id!}
                user={identity}
                videoTrack={userMedia.screenShareVideoTrack}
                pinnedId={pinnedId}
                setPinnedId={setPinnedId}
                showDebugInfo={debugEnabled}
              />
            )}

            {otherUsers.map((user) => {
              return (
                user.joined && (
                  <Fragment key={user.id}>
                    <PullVideoTrack video={dataSaverMode ? undefined : user.tracks?.video} audio={user.tracks?.audio}>
                      {({ videoTrack, audioTrack }) => (
                        <Participant
                          flipId={user.id!}
                          user={user}
                          videoTrack={videoTrack}
                          audioTrack={audioTrack}
                          pinnedId={pinnedId}
                          setPinnedId={setPinnedId}
                          showDebugInfo={debugEnabled}
                        />
                      )}
                    </PullVideoTrack>

                    {user.tracks?.screenShareEnabled && user.tracks?.screenshare && (
                      <PullVideoTrack video={user.tracks?.screenshare}>
                        {({ videoTrack }) => (
                          <Participant
                            isScreenShare
                            flipId={user.id! + '_screenshare'}
                            user={user}
                            videoTrack={videoTrack}
                            pinnedId={pinnedId}
                            setPinnedId={setPinnedId}
                            showDebugInfo={debugEnabled}
                          />
                        )}
                      </PullVideoTrack>
                    )}
                  </Fragment>
                )
              );
            })}
          </div>
        </Flipper>

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
