//
// Copyright 2024 DXOS.org
//

import React, { useMemo } from 'react';
import { combineLatest, fromEvent, map, switchMap } from 'rxjs';

import { Json } from '@dxos/react-ui-syntax-highlighter';
import { mx } from '@dxos/react-ui-theme';

import { useRoomContext, useSubscribedState } from '../../hooks';
import { type UserState } from '../../types';
import { usePulledAudioTrack, usePulledVideoTrack } from '../Call';
import { GridCell, type GridCellProps } from '../Grid';
import { VideoObject } from '../Media';

export const screenshareSuffix = '_screenshare';

export const Participant = ({ item: user, debug = false }: GridCellProps<UserState>) => {
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
    <GridCell item={user} speaking={user.speaking} wave={user.raisedHand} debug={debug}>
      <VideoObject
        className={mx('object-cover', isSelf && !isScreenShare ? 'scale-x-[-1]' : '')}
        videoTrack={videoTrack}
      />

      {debug && (
        <div className='absolute top-1 left-1'>
          <Json
            classNames='text-xs'
            data={{
              videoMid,
              videoSettings: videoTrack?.getSettings(),
              audioMid,
              audioSettings: audioTrack?.getSettings(),
            }}
          />
        </div>
      )}
    </GridCell>
  );
};

Participant.displayName = 'Participant';

// TODO(burdon): Mid?
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
