//
// Copyright 2024 DXOS.org
//

import React, { forwardRef, useEffect } from 'react';
import { Flipped } from 'react-flip-toolkit';

import { Button } from './Button';
import { HoverFade } from './HoverFade';
import { Icon } from './Icon/Icon';
import { VideoSrcObject } from './VideoSrcObject';
import { useRoomContext } from '../hooks/useRoomContext';
import { useUserMetadata } from '../hooks/useUserMetadata';
import type { User } from '../types/Messages';
import { cn } from '../utils/style';

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
    const { dataSaverMode } = useRoomContext();

    const pinned = flipId === pinnedId;

    useEffect(() => {
      if (isScreenShare) {
        setPinnedId(flipId);
      }
    }, [flipId, isScreenShare, setPinnedId]);

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
                <Button onClick={() => setPinnedId(pinned ? undefined : flipId)}>
                  <Icon type={pinned ? 'arrowsIn' : 'arrowsOut'} />
                </Button>
              </div>
            </HoverFade>
            {data?.displayName && (
              <div className='flex items-center gap-2 absolute m-2 text-shadow left-1 bottom-1 leading-none noopener noreferrer'>
                {data.displayName}
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
