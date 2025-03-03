//
// Copyright 2024 DXOS.org
//

import React, { useMemo } from 'react';

import { Json } from '@dxos/react-ui-syntax-highlighter';

import { useCallContext, usePulledAudioTrack, usePulledVideoTrack } from '../../hooks';
import { type UserState } from '../../types';
import { type CallsServicePeer } from '../../util';
import { VideoObject } from '../Media';
import { ResponsiveGridItem, type ResponsiveGridItemProps } from '../ResponsiveGrid';

export const Participant = ({ item: user, debug, ...props }: ResponsiveGridItemProps<UserState>) => {
  const {
    call: { user: self },
    dataSaverMode,
    userMedia,
    peer,
  } = useCallContext();
  const isSelf: boolean = self.id !== undefined && user.id !== undefined && user.id.startsWith(self.id);
  const isScreenshare = user.tracks?.screenshare;
  const pulledAudioTrack = usePulledAudioTrack(isScreenshare ? undefined : user.tracks?.audio);
  const pulledVideoTrack = usePulledVideoTrack(
    isScreenshare || (!isSelf && !dataSaverMode) ? user.tracks?.video : undefined,
  );

  const audioTrack = isSelf ? userMedia.state.audioTrack : pulledAudioTrack;
  const videoTrack = isSelf && !isScreenshare ? userMedia.state.videoTrack : pulledVideoTrack;

  // Debug.
  const audioMid = useMid({ track: audioTrack, peer });
  const videoMid = useMid({ track: videoTrack, peer });

  return (
    <ResponsiveGridItem
      {...props}
      item={user}
      name={user.name}
      self={isSelf}
      screenshare={!!isScreenshare}
      mute={audioTrack ? !audioTrack.enabled : false}
      wave={user.raisedHand}
      speaking={user.speaking}
      debug={debug}
    >
      <VideoObject videoTrack={videoTrack} flip={isSelf && !isScreenshare} contain={!!isScreenshare} />

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
    </ResponsiveGridItem>
  );
};

Participant.displayName = 'Participant';

/**
 * Get the track's media ID.
 */
const useMid = ({ track, peer }: { track?: MediaStreamTrack; peer?: CallsServicePeer }) => {
  const transceivers = useMemo(() => peer?.session?.peerConnection.getTransceivers(), [peer?.session?.peerConnection]);

  if (!track) {
    return null;
  }

  return transceivers?.find((t) => t.sender.track === track || t.receiver.track === track)?.mid;
};
