//
// Copyright 2024 DXOS.org
//

import { VisuallyHidden } from '@radix-ui/react-visually-hidden';
import React, { Fragment, useEffect, useState } from 'react';
import { Flipper } from 'react-flip-toolkit';
import { useMount } from 'react-use';

import { invariant } from '@dxos/invariant';
import { Button, Icon, Toolbar, type ThemedClassName } from '@dxos/react-ui';
import { mx } from '@dxos/react-ui-theme';
import { nonNullable } from '@dxos/util';

import { CameraButton } from './CameraButton';
import { MicButton } from './MicButton';
import { Participant } from './Participant';
import { PullAudioTracks } from './PullAudioTracks';
import { PullVideoTrack } from './PullVideoTrack';
import { useRoomContext, useBroadcastStatus } from '../hooks';

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

export const JoinedRoom = ({ classNames }: ThemedClassName) => {
  const debugEnabled = useDebugEnabled();
  const {
    userMedia,
    peer,
    dataSaverMode,
    pushedTracks,
    setJoined,
    room: { otherUsers: otherUsers, updateUserState, identity },
  } = useRoomContext()!;

  useMount(() => {
    // TODO(burdon): ???
    if (otherUsers.length > 5) {
      userMedia.turnMicOff();
    }
  });

  useBroadcastStatus({ userMedia, peer, updateUserState, identity, pushedTracks });
  const [pinnedId, setPinnedId] = useState<string>();
  const totalUsers = 1 + otherUsers.length;

  return (
    <PullAudioTracks audioTracks={otherUsers.map((user) => user.tracks?.audio).filter(nonNullable)}>
      <div className={mx('flex flex-col grow overflow-hidden', classNames)}>
        {/* https://github.com/aholachek/react-flip-toolkit */}
        <Flipper flipKey={totalUsers} className='flex flex-col h-full overflow-y-scroll'>
          <div className='flex flex-col gap-1'>
            {identity && userMedia.audioStreamTrack && (
              <Participant
                isSelf
                flipId={identity.id!}
                user={identity}
                videoTrack={userMedia.videoStreamTrack}
                audioTrack={userMedia.audioStreamTrack}
                pinnedId={pinnedId}
                setPinnedId={setPinnedId}
                showDebugInfo={debugEnabled}
              />
            )}

            {otherUsers.map((user) => {
              invariant(user.id);
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
                        ></Participant>
                      )}
                    </PullVideoTrack>
                    {user.tracks?.screenshare && user.tracks?.screenShareEnabled && (
                      <PullVideoTrack video={user.tracks?.screenshare}>
                        {({ videoTrack }) => (
                          <Participant
                            isScreenShare
                            flipId={user.id + 'screenshare'}
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
          <Button variant='destructive' onClick={() => setJoined(false)}>
            <VisuallyHidden>Leave</VisuallyHidden>
            <Icon icon={'ph--phone-x--regular'} />
          </Button>
          <div className='grow'></div>
          <MicButton />
          <CameraButton />
        </Toolbar.Root>
      </div>
    </PullAudioTracks>
  );
};
