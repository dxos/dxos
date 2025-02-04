//
// Copyright 2024 DXOS.org
//

import { VisuallyHidden } from '@radix-ui/react-visually-hidden';
import React, { Fragment, useEffect, useState } from 'react';
import { Flipper } from 'react-flip-toolkit';
import { useMeasure, useMount } from 'react-use';

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
  const [containerRef] = useMeasure<HTMLDivElement>();
  const [firstFlexChildRef] = useMeasure<HTMLDivElement>();

  const {
    userMedia,
    peer,
    dataSaverMode,
    pushedTracks,
    setJoined,
    room: { otherUsers, updateUserState, identity },
  } = useRoomContext()!;

  const debugEnabled = useDebugEnabled();
  const totalUsers = 1 + otherUsers.length;

  useMount(() => {
    if (otherUsers.length > 5) {
      userMedia.turnMicOff();
    }
  });

  useBroadcastStatus({ userMedia, peer, updateUserState, identity, pushedTracks });
  const [pinnedId, setPinnedId] = useState<string>();

  return (
    <PullAudioTracks audioTracks={otherUsers.map((user) => user.tracks?.audio).filter(nonNullable)}>
      <div className={mx('flex flex-col grow overflow-hidden', classNames)}>
        {/* https://github.com/aholachek/react-flip-toolkit */}
        <Flipper flipKey={totalUsers} className='flex flex-col h-full overflow-y-scroll'>
          <div className='flex flex-col gap-1' ref={containerRef}>
            {identity && userMedia.audioStreamTrack && (
              <Participant
                ref={firstFlexChildRef}
                // TODO(burdon): ?
                flipId={'identity user'}
                user={identity}
                isSelf
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
                          user={user}
                          flipId={user.id!}
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
                            user={user}
                            videoTrack={videoTrack}
                            flipId={user.id + 'screenshare'}
                            isScreenShare
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
