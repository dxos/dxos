//
// Copyright 2024 DXOS.org
//

import React, { memo, useMemo } from 'react';

import { useCapability } from '@dxos/app-framework/react';

import { type EncodedTrackName, type UserState } from '../../calls';
import { ThreadCapabilities } from '../../capabilities';
import { VideoObject } from '../Media';
import { ResponsiveGridItem, type ResponsiveGridItemProps } from '../ResponsiveGrid';

export const SCREENSHARE_SUFFIX = '_screenshare';

export const Participant = memo(({ item: user, debug, ...props }: ResponsiveGridItemProps<UserState>) => {
  const call = useCapability(ThreadCapabilities.CallManager);
  const isSelf: boolean = call.self.id !== undefined && user.id !== undefined && user.id.startsWith(call.self.id);
  const isScreenshare = user.id?.endsWith(SCREENSHARE_SUFFIX);

  const pulledVideoStream =
    !isSelf && isScreenshare && user.tracks?.screenshareEnabled
      ? call.getVideoStream(user.tracks?.screenshare as EncodedTrackName)
      : !isSelf && !isScreenshare && user.tracks?.videoEnabled
        ? call.getVideoStream(user.tracks?.video as EncodedTrackName)
        : undefined;

  const videoStream = useMemo<MediaStream | undefined>(() => {
    if (isSelf) {
      if (isScreenshare) {
        return call.media.screenshareVideoStream;
      } else if (!isScreenshare) {
        return call.media.videoStream;
      }
    } else if (!isSelf) {
      return pulledVideoStream;
    }
  }, [isSelf, isScreenshare, call.media.videoStream, call.media.screenshareVideoStream, pulledVideoStream]);

  return (
    <ResponsiveGridItem
      {...props}
      item={user}
      name={user.name}
      self={isSelf}
      screenshare={!!call.media.screenshareVideoStream}
      video={call.media.videoEnabled}
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
