//
// Copyright 2024 DXOS.org
//

import React, { forwardRef, useMemo } from 'react';
import { combineLatest, fromEvent, map, switchMap } from 'rxjs';

import { mx } from '@dxos/react-ui-theme';

import { useRoomContext, useSubscribedState } from '../../hooks';
import { type UserState } from '../../types';
import { usePulledAudioTrack, usePulledVideoTrack } from '../Call';
import { VideoObject } from '../Media';

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

export const screenshareSuffix = '_screenshare';

export type ParticipantProps = {
  user: UserState;
  debug?: boolean;
};

export const Participant = forwardRef<HTMLDivElement, ParticipantProps>(({ user, debug = false }, ref) => {
  const {
    dataSaverMode,
    userMedia,
    room: { identity },
  } = useRoomContext();
  const isSelf = identity.id && user.id?.startsWith(identity.id);
  const isScreenShare = user.id?.endsWith(screenshareSuffix);
  const pulledAudioTrack = usePulledAudioTrack(isScreenShare ? undefined : user.tracks?.audio);
  const pulledVideoTrack = usePulledVideoTrack(
    isScreenShare || (!isSelf && !dataSaverMode) ? user.tracks?.video : undefined,
  );
  const audioTrack = isSelf ? userMedia.audioTrack : pulledAudioTrack;
  const videoTrack = isSelf && !isScreenShare ? userMedia.videoTrack : pulledVideoTrack;

  const audioMid = useMid(audioTrack);
  const videoMid = useMid(videoTrack);

  return (
    <div className='flex w-full h-full relative' ref={ref}>
      <div className={mx('flex w-full h-full overflow-hidden animate-fadeIn')}>
        <VideoObject
          className={mx('object-cover', isSelf && !isScreenShare ? 'scale-x-[-1]' : '')}
          videoTrack={videoTrack}
        />

        {user.name && (
          <div className='absolute right-0 bottom-0 m-1 p-1 px-2 flex items-center bg-black text-white text-sm'>
            {user.name}
          </div>
        )}

        {debug && (
          <span className='m-2 absolute opacity-50'>
            {[
              `video mid: ${videoMid}`,
              `audio mid: ${audioMid}`,
              `video settings: ${JSON.stringify(videoTrack?.getSettings(), null, 2)}`,
              `audio settings: ${JSON.stringify(audioTrack?.getSettings(), null, 2)}`,
            ].join(' | ')}
          </span>
        )}

        {/* TODO(burdon): Speaking indicator. */}
        {(user.speaking || user.raisedHand) && (
          <div className={mx('pointer-events-none absolute inset-0 h-full w-full', 'border-4 border-orange-400')}></div>
        )}
      </div>
    </div>
  );
});

Participant.displayName = 'Participant';
