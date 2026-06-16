//
// Copyright 2024 DXOS.org
//

import { useAtomValue } from '@effect-atom/atom-react';
import React, { memo, useMemo } from 'react';

import { useCapability } from '@dxos/app-framework/ui';

import { CallsCapabilities } from '#types';

import { type EncodedTrackName, type UserState } from '../../calls';
import { VideoObject } from '../Media';
import { ResponsiveGridItem, type ResponsiveGridItemProps } from '../ResponsiveGrid';

export const SCREENSHARE_SUFFIX = '_screenshare';

export const Participant = memo(({ item: user, debug, ...props }: ResponsiveGridItemProps<UserState>) => {
  const call = useCapability(CallsCapabilities.Manager);
  const self = useAtomValue(call.selfAtom);
  const videoEnabled = useAtomValue(call.videoEnabledAtom);
  const localVideoStream = useAtomValue(call.localVideoStreamAtom);
  const screenshareVideoStream = useAtomValue(call.screenshareVideoStreamAtom);
  const isSelf: boolean = self.id !== undefined && user.id !== undefined && user.id.startsWith(self.id);
  const isScreenshare = user.id?.endsWith(SCREENSHARE_SUFFIX);

  // Track name to display for non-self users; undefined when no video should show.
  const pulledTrackName = useMemo<EncodedTrackName | undefined>(() => {
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
  }, [
    isSelf,
    isScreenshare,
    user.tracks?.screenshare,
    user.tracks?.video,
    user.tracks?.screenshareEnabled,
    user.tracks?.videoEnabled,
  ]);

  const pulledVideoStream = useAtomValue(call.videoStreamAtom(pulledTrackName));

  const videoStream = useMemo<MediaStream | undefined>(() => {
    if (isSelf) {
      return isScreenshare ? screenshareVideoStream : localVideoStream;
    }
    return pulledVideoStream;
  }, [isSelf, isScreenshare, localVideoStream, screenshareVideoStream, pulledVideoStream]);

  return (
    <ResponsiveGridItem
      {...props}
      item={user}
      name={user.name}
      self={isSelf}
      screenshare={!!screenshareVideoStream}
      video={videoEnabled}
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
