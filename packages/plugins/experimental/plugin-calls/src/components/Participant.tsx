//
// Copyright 2024 DXOS.org
//

import React, { forwardRef, useEffect, useMemo } from 'react';
import { Flipped } from 'react-flip-toolkit';
import { combineLatest, fromEvent, map, switchMap } from 'rxjs';

import { mx } from '@dxos/react-ui-theme';

import { VideoObject } from './VideoObject';
import { useRoomContext, useSubscribedState } from '../hooks';
import { type UserState } from '../types';

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
    const pinned = flipId === pinnedId;

    useEffect(() => {
      if (isScreenShare) {
        setPinnedId(flipId);
      }
    }, [flipId, isScreenShare, setPinnedId]);

    const audioMid = useMid(audioTrack);
    const videoMid = useMid(videoTrack);

    return (
      <div className='flex aspect-video relative' ref={ref}>
        <Flipped flipId={flipId + pinned}>
          <div className={mx('w-full h-full mx-auto overflow-hidden text-white animate-fadeIn')}>
            <VideoObject
              className={mx(
                'absolute inset-0 h-full w-full object-cover opacity-0 transition-opacity',
                isSelf && !isScreenShare && '-scale-x-100',
              )}
              videoTrack={videoTrack}
            />

            {user.name && (
              <div className='absolute m-0.5 flex items-center bg-black text-white p-1 gap-2 text-shadow left-1 bottom-1 leading-none noopener noreferrer'>
                {user.name}
              </div>
            )}

            {showDebugInfo && (
              <span className='m-2 absolute opacity-50'>
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
                className={mx('pointer-events-none absolute inset-0 h-full w-full border-4 border-orange-400')}
              ></div>
            )}
          </div>
        </Flipped>
      </div>
    );
  },
);

Participant.displayName = 'CallGridChild';
