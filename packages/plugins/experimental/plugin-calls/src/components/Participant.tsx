//
// Copyright 2024 DXOS.org
//

import React, { forwardRef, useEffect, useMemo } from 'react';
import { Flipped } from 'react-flip-toolkit';
import { combineLatest, fromEvent, map, switchMap } from 'rxjs';

import type { UserState } from '@dxos/protocols/proto/dxos/edge/calls';

import { VideoSrcObject } from './VideoSrcObject';
import { useRoomContext, useSubscribedState } from './hooks';
import { cn } from './utils';

interface Props {
  flipId: string;
  isScreenShare?: boolean;
  user: UserState;
  audioTrack?: MediaStreamTrack;
  videoTrack?: MediaStreamTrack;
  isSelf?: boolean;
  pinnedId?: string;
  setPinnedId: (id?: string) => void;
  showDebugInfo?: boolean;
}

const useMid = (track?: MediaStreamTrack) => {
  const { peer } = useRoomContext();
  const transceivers$ = useMemo(
    () =>
      combineLatest([
        peer.peerConnection$,
        peer.peerConnection$.pipe(switchMap((peerConnection) => fromEvent(peerConnection, 'track'))),
      ]).pipe(map(([pc]) => pc.getTransceivers())),
    [peer.peerConnection$],
  );
  const transceivers = useSubscribedState(transceivers$, []);
  if (!track) {
    return null;
  }
  return transceivers.find((t) => t.sender.track === track || t.receiver.track === track)?.mid;
};

export const Participant = forwardRef<HTMLDivElement, JSX.IntrinsicElements['div'] & Props>(
  (
    {
      videoTrack,
      audioTrack,
      isSelf = false,
      flipId,
      user,
      isScreenShare = false,
      pinnedId,
      setPinnedId,
      showDebugInfo = false,
    },
    ref,
  ) => {
    const { dataSaverMode } = useRoomContext();

    const pinned = flipId === pinnedId;

    useEffect(() => {
      if (isScreenShare) {
        setPinnedId(flipId);
      }
    }, [flipId, isScreenShare, setPinnedId]);

    const audioMid = useMid(audioTrack);
    const videoMid = useMid(videoTrack);

    return (
      <div className='grow shrink text-base basis-[calc(var(--flex-container-width)_-_var(--gap)_*_3)]' ref={ref}>
        <Flipped flipId={flipId + pinned}>
          <div
            className={cn(
              'h-full mx-auto overflow-hidden text-white animate-fadeIn',
              pinned
                ? 'absolute inset-0 h-full w-full z-10 rounded-none bg-black'
                : 'relative max-w-[--participant-max-width] rounded-xl',
            )}
          >
            <VideoSrcObject
              className={cn(
                'absolute inset-0 h-full w-full object-contain opacity-0 transition-opacity',
                isSelf && !isScreenShare && '-scale-x-100',
                {
                  'opacity-100': isScreenShare
                    ? user.tracks.screenShareEnabled
                    : user.tracks.videoEnabled && (!dataSaverMode || isSelf),
                },
                isSelf && isScreenShare && 'opacity-75',
              )}
              videoTrack={videoTrack}
            />
            {user.name && (
              <div className='flex items-center gap-2 absolute m-2 text-shadow left-1 bottom-1 leading-none noopener noreferrer'>
                {user.name}
              </div>
            )}
            {showDebugInfo && (
              <span className='m-2 absolute text-black bg-white opacity-50'>
                {[
                  `video mid: ${videoMid}`,
                  `audio mid: ${audioMid}`,
                  `video settings: ${JSON.stringify(videoTrack?.getSettings(), null, 2)}`,
                  `audio settings: ${JSON.stringify(audioTrack?.getSettings(), null, 2)}`,
                ].join(' | ')}
              </span>
            )}
            {(user.speaking || user.raisedHand) && (
              <div
                className={cn(
                  'pointer-events-none absolute inset-0 h-full w-full border-4 border-orange-400',
                  !pinned && 'rounded-xl',
                )}
              ></div>
            )}
          </div>
        </Flipped>
      </div>
    );
  },
);

Participant.displayName = 'CallGridChild';
