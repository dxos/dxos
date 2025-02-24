//
// Copyright 2024 DXOS.org
//

import React, { useMemo } from 'react';
import { combineLatest, fromEvent, map, switchMap } from 'rxjs';

import { Json } from '@dxos/react-ui-syntax-highlighter';

import { useCallContext, useSubscribedState } from '../../hooks';
import { type UserState } from '../../types';
import { usePulledAudioTrack, usePulledVideoTrack } from '../Call';
import { GridCell, type GridCellProps } from '../Grid';
import { VideoObject } from '../Media';

export const Participant = ({ item: user, debug, ...props }: GridCellProps<UserState>) => {
  const {
    dataSaverMode,
    userMedia,
    room: { user: self },
  } = useCallContext();
  const isSelf: boolean = self.id !== undefined && user.id !== undefined && user.id.startsWith(self.id);
  const isScreenshare = user.tracks?.screenshare;
  const pulledAudioTrack = usePulledAudioTrack(isScreenshare ? undefined : user.tracks?.audio);
  const pulledVideoTrack = usePulledVideoTrack(
    isScreenshare || (!isSelf && !dataSaverMode) ? user.tracks?.video : undefined,
  );

  const audioTrack = isSelf ? userMedia.audioTrack : pulledAudioTrack;
  const videoTrack = isSelf && !isScreenshare ? userMedia.videoTrack : pulledVideoTrack;

  // Debug.
  const audioMid = useMid(audioTrack);
  const videoMid = useMid(videoTrack);

  return (
    <GridCell {...props} item={user} name={user.name} speaking={user.speaking} wave={user.raisedHand} debug={debug}>
      <VideoObject videoTrack={videoTrack} flip={isSelf && !isScreenshare} />

      {debug && (
        <div className='absolute top-1 left-1'>
          <Json
            classNames='text-xs'
            data={{
              audioMid,
              videoMid,
              audioSettings: audioTrack?.getSettings(),
              videoSettings: videoTrack?.getSettings(),
            }}
          />
        </div>
      )}
    </GridCell>
  );
};

Participant.displayName = 'Participant';

/**
 * Get the track's media ID.
 */
const useMid = (track?: MediaStreamTrack) => {
  const { peer } = useCallContext();
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
