//
// Copyright 2024 DXOS.org
//

import { useAtomValue } from '@effect-atom/atom-react';
import React, { memo, useMemo } from 'react';

import { useCapability } from '@dxos/app-framework/react';

import { type EncodedTrackName, type UserState } from '../../calls';
import { ThreadCapabilities } from '../../types';
import { VideoObject } from '../Media';
import { ResponsiveGridItem, type ResponsiveGridItemProps } from '../ResponsiveGrid';

export const SCREENSHARE_SUFFIX = '_screenshare';

export const Participant = memo(({ item: user, debug, ...props }: ResponsiveGridItemProps<UserState>) => {
  const call = useCapability(ThreadCapabilities.CallManager);
  const self = useAtomValue(call.selfAtom);
  const media = useAtomValue(call.mediaAtom);
  const isSelf: boolean = self.id !== undefined && user.id !== undefined && user.id.startsWith(self.id);
  const isScreenshare = user.id?.endsWith(SCREENSHARE_SUFFIX);

  // Get pulled video stream for non-self users.
  const pulledVideoStream = useMemo<MediaStream | undefined>(() => {
    if (isSelf) {
      return undefined;
    }
    const trackName =
      isScreenshare && user.tracks?.screenshareEnabled
        ? (user.tracks?.screenshare as EncodedTrackName)
        : !isScreenshare && user.tracks?.videoEnabled
          ? (user.tracks?.video as EncodedTrackName)
          : undefined;
    return trackName ? media.pulledVideoStreams[trackName]?.stream : undefined;
  }, [
    isSelf,
    isScreenshare,
    media.pulledVideoStreams,
    user.tracks?.screenshare,
    user.tracks?.video,
    user.tracks?.screenshareEnabled,
    user.tracks?.videoEnabled,
  ]);

  const videoStream = useMemo<MediaStream | undefined>(() => {
    if (isSelf) {
      return isScreenshare ? media.screenshareVideoStream : media.videoStream;
    }
    return pulledVideoStream;
  }, [isSelf, isScreenshare, media.videoStream, media.screenshareVideoStream, pulledVideoStream]);

  return (
    <ResponsiveGridItem
      {...props}
      item={user}
      name={user.name}
      self={isSelf}
      screenshare={!!media.screenshareVideoStream}
      video={media.videoEnabled}
      mute={user ? !user.tracks?.audioEnabled : false}
      wave={user.raisedHand}
      speaking={user.speaking}
      debug={debug}
    >
      <VideoObject
        videoStream={videoStream}
        flip={isSelf && !isScreenshare}
        contain={!!isScreenshare}
        classNames='rounded-md'
      />
    </ResponsiveGridItem>
  );
});

Participant.displayName = 'Participant';
