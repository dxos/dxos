//
// Copyright 2024 DXOS.org
//

import { nanoid } from 'nanoid';
import React, { Fragment, useCallback, useEffect, useMemo, useState } from 'react';
import { Flipper } from 'react-flip-toolkit';
import { useNavigate } from 'react-router-dom';
import { useMeasure, useMount, useWindowSize } from 'react-use';

import { nonNullable } from '@dxos/util';

import { Button } from '../app/components/Button';
import { CameraButton } from '../app/components/CameraButton';
import { CopyButton } from '../app/components/CopyButton';
import { HighPacketLossWarningsToast } from '../app/components/HighPacketLossWarningsToast';
import { IceDisconnectedToast } from '../app/components/IceDisconnectedToast';
import { Icon } from '../app/components/Icon/Icon';
import { LeaveRoomButton } from '../app/components/LeaveRoomButton';
import { MicButton } from '../app/components/MicButton';
import { OverflowMenu } from '../app/components/OverflowMenu';
import { Participant } from '../app/components/Participant';
import { ParticipantsButton } from '../app/components/ParticipantsMenu';
import { PullAudioTracks } from '../app/components/PullAudioTracks';
import { PullVideoTrack } from '../app/components/PullVideoTrack';
import { RaiseHandButton } from '../app/components/RaiseHandButton';
import { ScreenshareButton } from '../app/components/ScreenshareButton';
import Toast from '../app/components/Toast';
import useBroadcastStatus from '../app/hooks/useBroadcastStatus';
import useIsSpeaking from '../app/hooks/useIsSpeaking';
import { useRoomContext } from '../app/hooks/useRoomContext';
import useStageManager from '../app/hooks/useStageManager';
import { useUserJoinLeaveToasts } from '../app/hooks/useUserJoinLeaveToasts';
import { calculateLayout } from '../app/utils/calculateLayout';

const useDebugEnabled = () => {
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === 'd' && e.ctrlKey) {
        e.preventDefault();
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

const useGridDebugControls = ({ initialCount, enabled }: { initialCount: number; enabled: boolean }) => {
  const [fakeUsers, setFakeUsers] = useState<string[]>(Array.from({ length: initialCount }).map(() => nanoid()));

  const GridDebugControls = useCallback(
    () =>
      enabled ? (
        <>
          <Button onClick={() => setFakeUsers((fu) => [...fu, nanoid(14)])}>
            <Icon type='PlusIcon' />
          </Button>
          <Button
            onClick={() => {
              setFakeUsers((fu) => {
                const randomLeaver = fu[Math.floor(Math.random() * fu.length)];
                return fu.filter((x) => x !== randomLeaver);
              });
            }}
          >
            <Icon type='MinusIcon' />
          </Button>
        </>
      ) : null,
    [enabled],
  );

  return {
    GridDebugControls,
    fakeUsers,
  };
};

export default () => {
  const mode: string = 'production';
  const { joined } = useRoomContext()!;
  const navigate = useNavigate();

  useEffect(() => {
    if (!joined && mode !== 'development') {
      navigate('/');
    }
  }, [joined, mode, navigate]);

  if (!joined && mode !== 'development') {
    return null;
  }

  return (
    <Toast.Provider>
      <JoinedRoom />
    </Toast.Provider>
  );
};

const JoinedRoom = () => {
  const {
    userMedia,
    peer,
    dataSaverMode,
    pushedTracks,
    room: {
      otherUsers,
      websocket,
      identity,
      roomState: { meetingId },
    },
  } = useRoomContext()!;

  const debugEnabled = useDebugEnabled();
  const { GridDebugControls, fakeUsers } = useGridDebugControls({
    enabled: debugEnabled,
    initialCount: 0,
  });

  const [containerRef, { width: containerWidth, height: containerHeight }] = useMeasure<HTMLDivElement>();
  const [firstFlexChildRef, { width: firstFlexChildWidth }] = useMeasure<HTMLDivElement>();

  const totalUsers = 1 + fakeUsers.length + otherUsers.length;

  const [raisedHand, setRaisedHand] = useState(false);
  const speaking = useIsSpeaking(userMedia.audioStreamTrack);

  useMount(() => {
    if (otherUsers.length > 5) {
      userMedia.turnMicOff();
    }
  });

  useBroadcastStatus({
    userMedia,
    peer,
    websocket,
    identity,
    pushedTracks,
    raisedHand,
    speaking,
  });

  useUserJoinLeaveToasts(otherUsers);

  const { width } = useWindowSize();

  const stageLimit = width < 600 ? 2 : 8;

  const { recordActivity, actorsOnStage } = useStageManager(otherUsers, stageLimit);

  useEffect(() => {
    otherUsers.forEach((u) => {
      if (u.speaking || u.raisedHand || u.tracks.screenShareEnabled) {
        recordActivity(u);
      }
    });
  }, [otherUsers, recordActivity]);

  const [pinnedId, setPinnedId] = useState<string>();

  const flexContainerWidth = useMemo(
    () =>
      100 /
        calculateLayout({
          count: totalUsers,
          height: containerHeight,
          width: containerWidth,
        }).cols +
      '%',
    [totalUsers, containerHeight, containerWidth],
  );

  return (
    <PullAudioTracks audioTracks={otherUsers.map((u) => u.tracks.audio).filter(nonNullable)}>
      <div className='flex flex-col h-full bg-white dark:bg-zinc-800'>
        <Flipper flipKey={totalUsers} className='relative flex-grow overflow-hidden isolate'>
          <div
            className='absolute inset-0 h-full w-full bg-black isolate flex flex-wrap justify-around gap-[--gap] p-[--gap]'
            style={
              {
                '--gap': '1rem',
                // the flex basis that is needed to achieve row layout
                '--flex-container-width': flexContainerWidth,
                // the size of the first user's flex container
                '--participant-max-width': firstFlexChildWidth + 'px',
              } as any
            }
            ref={containerRef}
          >
            {identity && userMedia.audioStreamTrack && (
              <Participant
                user={identity}
                isSelf
                flipId={'identity user'}
                ref={firstFlexChildRef}
                videoTrack={userMedia.videoStreamTrack}
                audioTrack={userMedia.audioStreamTrack}
                pinnedId={pinnedId}
                setPinnedId={setPinnedId}
                showDebugInfo={debugEnabled}
              />
            )}

            {identity && userMedia.screenShareVideoTrack && userMedia.screenShareEnabled && (
              <Participant
                user={identity}
                flipId={'identity user screenshare'}
                isSelf
                isScreenShare
                videoTrack={userMedia.screenShareVideoTrack}
                pinnedId={pinnedId}
                setPinnedId={setPinnedId}
                showDebugInfo={debugEnabled}
              />
            )}
            {actorsOnStage.map((user) => (
              <Fragment key={user.id}>
                <PullVideoTrack video={dataSaverMode ? undefined : user.tracks.video} audio={user.tracks.audio}>
                  {({ videoTrack, audioTrack }) => (
                    <Participant
                      user={user}
                      flipId={user.id}
                      videoTrack={videoTrack}
                      audioTrack={audioTrack}
                      pinnedId={pinnedId}
                      setPinnedId={setPinnedId}
                      showDebugInfo={debugEnabled}
                    ></Participant>
                  )}
                </PullVideoTrack>
                {user.tracks.screenshare && user.tracks.screenShareEnabled && (
                  <PullVideoTrack video={user.tracks.screenshare}>
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
            ))}

            {identity &&
              userMedia.audioStreamTrack &&
              userMedia.videoStreamTrack &&
              fakeUsers.map((uid) => (
                <PullVideoTrack key={identity.id} video={identity.tracks.video} audio={identity.tracks.audio}>
                  {({ videoTrack }) => (
                    <Participant
                      user={identity}
                      isSelf
                      videoTrack={videoTrack}
                      audioTrack={userMedia.audioStreamTrack}
                      key={uid}
                      flipId={uid.toString()}
                      pinnedId={pinnedId}
                      setPinnedId={setPinnedId}
                      showDebugInfo={debugEnabled}
                    ></Participant>
                  )}
                </PullVideoTrack>
              ))}
          </div>
          <Toast.Viewport />
        </Flipper>
        <div className='flex flex-wrap items-center justify-center gap-2 p-2 text-sm md:gap-4 md:p-5 md:text-base'>
          <GridDebugControls />
          <MicButton warnWhenSpeakingWhileMuted />
          <CameraButton />
          <ScreenshareButton />
          <RaiseHandButton raisedHand={raisedHand} onClick={() => setRaisedHand(!raisedHand)} />
          <ParticipantsButton
            identity={identity}
            otherUsers={otherUsers}
            className='hidden md:block'
          ></ParticipantsButton>
          <OverflowMenu />
          <LeaveRoomButton meetingId={meetingId} />
          {debugEnabled && meetingId && <CopyButton contentValue={meetingId}>Meeting Id</CopyButton>}
        </div>
      </div>
      <HighPacketLossWarningsToast />
      <IceDisconnectedToast />
    </PullAudioTracks>
  );
};
