//
// Copyright 2024 DXOS.org
//

import { VisuallyHidden } from '@radix-ui/react-visually-hidden';
import React, { forwardRef, useEffect, useMemo } from 'react';
import { Flipped } from 'react-flip-toolkit';
import { combineLatest, fromEvent, map, switchMap } from 'rxjs';

import { AudioIndicator } from './AudioIndicator';
import { Button } from './Button';
import { HoverFade } from './HoverFade';
import { Icon } from './Icon/Icon';
import { OptionalLink } from './OptionalLink';
import { Tooltip } from './Tooltip';
import { VideoSrcObject } from './VideoSrcObject';
import { useSubscribedState } from '../hooks/rxjsHooks';
import { useRoomContext } from '../hooks/useRoomContext';
import { useUserMetadata } from '../hooks/useUserMetadata';
import type { User } from '../types/Messages';
import populateTraceLink from '../utils/populateTraceLink';
import { cn } from '../utils/style';

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

interface Props {
  flipId: string;
  isScreenShare?: boolean;
  showDebugInfo?: boolean;
  user: User;
  audioTrack?: MediaStreamTrack;
  videoTrack?: MediaStreamTrack;
  isSelf?: boolean;
  pinnedId?: string;
  setPinnedId: (id?: string) => void;
}

export const Participant = forwardRef<HTMLDivElement, JSX.IntrinsicElements['div'] & Props>(
  (
    {
      videoTrack,
      isSelf = false,
      flipId,
      user,
      isScreenShare = false,
      audioTrack,
      pinnedId,
      setPinnedId,
      showDebugInfo,
    },
    ref,
  ) => {
    const { data } = useUserMetadata(user.name);
    const { traceLink, peer, dataSaverMode } = useRoomContext();
    const peerConnection = useSubscribedState(peer.peerConnection$);

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
            <HoverFade className='absolute inset-0 grid w-full h-full place-items-center'>
              <div className='flex gap-2 p-2 rounded bg-zinc-900/30'>
                <Tooltip content={pinned ? 'Restore' : 'Maximize'}>
                  <Button onClick={() => setPinnedId(pinned ? undefined : flipId)}>
                    <Icon type={pinned ? 'arrowsIn' : 'arrowsOut'} />
                  </Button>
                </Tooltip>
              </div>
            </HoverFade>
            {audioTrack && (
              <div className='absolute left-4 top-4'>
                {user.tracks.audioEnabled && user.tracks.videoEnabled && user.speaking && (
                  <AudioIndicator audioTrack={audioTrack} />
                )}

                {!user.tracks.audioEnabled && (
                  <Tooltip content='Mic is turned off'>
                    <div className='indication-shadow'>
                      <Icon type='micOff' />
                      <VisuallyHidden>Mic is turned off</VisuallyHidden>
                    </div>
                  </Tooltip>
                )}
              </div>
            )}
            {data?.displayName && user.transceiverSessionId && (
              <div className='flex items-center gap-2 absolute m-2 text-shadow left-1 bottom-1'>
                <OptionalLink
                  className='leading-none'
                  href={populateTraceLink(user.transceiverSessionId, traceLink)}
                  target='_blank'
                  rel='noopener noreferrer'
                >
                  {data.displayName}
                  {showDebugInfo && peerConnection && (
                    <span className='opacity-50'>
                      {' '}
                      {[audioMid && `audio mid: ${audioMid}`, videoMid && `video mid: ${videoMid}`]
                        .filter(Boolean)
                        .join(' ')}
                    </span>
                  )}
                </OptionalLink>
              </div>
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
