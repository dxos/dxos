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

  // Determine which track to pull (if any) for non-self users.
  const trackToPull = useMemo<EncodedTrackName | undefined>(() => {
    if (isSelf) {
      return undefined;
    }
    if (isScreenshare && user.tracks?.screenshareEnabled) {
      return user.tracks?.screenshare as EncodedTrackName;
    }
    if (!isScreenshare && user.tracks?.videoEnabled) {
      return user.tracks?.video as EncodedTrackName;
    }
    return undefined;
  }, [isSelf, isScreenshare, user.tracks?.screenshare, user.tracks?.video, user.tracks?.screenshareEnabled, user.tracks?.videoEnabled]);

  // Get pulled video streams from media state.
  const pulledVideoStream = useMemo<MediaStream | undefined>(() => {
    if (!trackToPull) {
      return undefined;
    }
    return media.pulledVideoStreams[trackToPull]?.stream;
  }, [media.pulledVideoStreams, trackToPull]);

  const videoStream = useMemo<MediaStream | undefined>(() => {
    if (isSelf) {
      if (isScreenshare) {
        return media.screenshareVideoStream;
      } else if (!isScreenshare) {
        return media.videoStream;
      }
    } else if (!isSelf) {
      return pulledVideoStream;
    }
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
