//
// Copyright 2024 DXOS.org
//

import React, { useMemo } from 'react';

import { useCallGlobalContext } from '../../hooks';
import { type EncodedTrackName, type UserState } from '../../types';
import { VideoObject } from '../Media';
import { ResponsiveGridItem, type ResponsiveGridItemProps } from '../ResponsiveGrid';

export const SCREENSHARE_SUFFIX = '_screenshare';

export const Participant = ({ item: user, debug, ...props }: ResponsiveGridItemProps<UserState>) => {
  const { call } = useCallGlobalContext();
  const isSelf: boolean = call.self.id !== undefined && user.id !== undefined && user.id.startsWith(call.self.id);
  const isScreenshare = user.id?.endsWith(SCREENSHARE_SUFFIX);
  const pulledVideoStream = call.getVideoStream(
    isScreenshare || !isSelf ? (user.tracks?.video as EncodedTrackName) : undefined,
  );

  const videoStream: MediaStream | undefined = useMemo(() => {
    if (isSelf && !isScreenshare) {
      return call.media.videoStream;
    } else if (isSelf && isScreenshare) {
      return call.media.screenshareVideoStream;
    } else if (!isSelf) {
      return pulledVideoStream;
    }
  }, [isSelf, call.media.videoStream, call.media.screenshareVideoStream, isScreenshare, pulledVideoStream]);

  return (
    <ResponsiveGridItem
      {...props}
      item={user}
      name={user.name}
      self={isSelf}
      screenshare={!!isScreenshare}
      mute={user ? !user.tracks?.audioEnabled : false}
      wave={user.raisedHand}
      speaking={user.speaking}
      debug={debug}
    >
      <VideoObject videoStream={videoStream} flip={isSelf && !isScreenshare} contain={!!isScreenshare} />
    </ResponsiveGridItem>
  );
};

Participant.displayName = 'Participant';
