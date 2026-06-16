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
  // Guard on both the enabled flag and track-ID presence — a track may be enabled in state
  // before the ID has been published to the swarm.
  const pulledTrackName = useMemo<EncodedTrackName | undefined>(() => {
    if (isSelf) {
      return undefined;
    }
    if (isScreenshare && user.tracks?.screenshareEnabled && user.tracks?.screenshare) {
      return user.tracks.screenshare as EncodedTrackName;
    }
    if (!isScreenshare && user.tracks?.videoEnabled && user.tracks?.video) {
      return user.tracks.video as EncodedTrackName;
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

  // For self tiles use local media state; for remote tiles use the participant's swarm-reported state.
  // Self screenshare tiles gate on screenshareVideoStream, not camera state.
  // Remote tiles require both the enabled flag and track-ID presence to stay consistent with pulledTrackName.
  const participantVideo = isSelf
    ? isScreenshare
      ? Boolean(screenshareVideoStream)
      : videoEnabled
    : isScreenshare
      ? Boolean(user.tracks?.screenshareEnabled && user.tracks?.screenshare)
      : Boolean(user.tracks?.videoEnabled && user.tracks?.video);

  return (
    <ResponsiveGridItem
      {...props}
      item={user}
      name={user.name}
      self={isSelf}
      screenshare={isScreenshare && participantVideo}
      video={participantVideo}
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
