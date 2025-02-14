//
// Copyright 2024 DXOS.org
//

import React, { forwardRef, useMemo } from 'react';
import { combineLatest, fromEvent, map, switchMap } from 'rxjs';

import { Button, Icon } from '@dxos/react-ui';
import { mx } from '@dxos/react-ui-theme';

import { HoverFade } from './HoverFade';
import { useRoomContext, useSubscribedState } from '../../hooks';
import { type UserState } from '../../types';
import { usePulledAudioTrack, usePulledVideoTrack } from '../Call';
import { VideoObject } from '../Video';

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

export type ParticipantProps = {
  user: UserState;
  showDebugInfo?: boolean;
  pinnedParticipant?: UserState;
  setPinnedParticipant: (id?: string) => void;
};

export const screenshareSuffix = '_screenshare';

export const Participant = forwardRef<HTMLDivElement, ParticipantProps>(
  ({ user, showDebugInfo = false, pinnedParticipant, setPinnedParticipant }, ref) => {
    const {
      dataSaverMode,
      userMedia,
      room: { identity },
    } = useRoomContext();
    const id = user.id!;
    const isSelf = identity.id && id.startsWith(identity.id);
    const isScreenShare = id.endsWith(screenshareSuffix);
    const pulledAudioTrack = usePulledAudioTrack(isScreenShare ? undefined : user.tracks!.audio);
    const pulledVideoTrack = usePulledVideoTrack(
      isScreenShare || (!isSelf && !dataSaverMode) ? user.tracks!.video : undefined,
    );
    const audioTrack = isSelf ? userMedia.audioTrack : pulledAudioTrack;
    const videoTrack = isSelf && !isScreenShare ? userMedia.videoTrack : pulledVideoTrack;
    const isPinned = pinnedParticipant?.id === id;

    const audioMid = useMid(audioTrack);
    const videoMid = useMid(videoTrack);

    return (
      <div className='shrink w-full basis-[calc(var(--flex-container-width)_-_var(--gap)_*_3)]' ref={ref}>
        <div className={mx('h-full mx-auto overflow-hidden', 'relative max-w-[--participant-max-width]')}>
          <VideoObject
            className={mx(
              'absolute inset-0 h-full w-full object-contain bg-slate-500',
              isSelf && !isScreenShare ? 'scale-x-[-1]' : '',
            )}
            videoTrack={videoTrack}
          />

          {user.name && (
            <div className='absolute right-0 bottom-0 m-1 p-1 px-2 flex items-center bg-black text-white text-sm'>
              {user.name}
            </div>
          )}
          {!isPinned && (
            <HoverFade className='absolute inset-0 grid w-full h-full place-items-center'>
              <div className='flex gap-2 p-2 rounded  bg-zinc-900/30 opacity-75'>
                <Button onClick={() => setPinnedParticipant(id)}>
                  <Icon icon='ph--arrows-out--regular' />
                </Button>
              </div>
            </HoverFade>
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
              className={mx(
                'pointer-events-none absolute inset-0',
                'h-full w-full border-4 border-orange-400 rounded-xl',
              )}
            ></div>
          )}
        </div>
      </div>
    );
  },
);

Participant.displayName = 'Participant';
