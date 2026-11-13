//
// Copyright 2024 DXOS.org
//

import { useAtomValue } from '@effect/atom-react/Hooks';
import React, { memo, useMemo } from 'react';

import * as Hooks from '@dxos/app-framework/Hooks';

import { CallsCapabilities } from '#types';

import { type UserState } from '../../calls/index.ts';
import { VideoObject } from '../Media/index.ts';
import { ResponsiveGridItem, type ResponsiveGridItemProps } from '../ResponsiveGrid/index.ts';

export const SCREENSHARE_SUFFIX = '_screenshare';

export const Participant = memo(({ item: user, debug, ...props }: ResponsiveGridItemProps<UserState>) => {
  const call = Hooks.useCapability(CallsCapabilities.Manager);
  const self = useAtomValue(call.selfAtom);
  const videoEnabled = useAtomValue(call.videoEnabledAtom);
  const localVideoStream = useAtomValue(call.localVideoStreamAtom);
  const screenshareVideoStream = useAtomValue(call.screenshareVideoStreamAtom);
  const isSelf: boolean = self.id !== undefined && user.id !== undefined && user.id.startsWith(self.id);
  const isScreenshare = user.id?.endsWith(SCREENSHARE_SUFFIX);

  // A remote tile shows its device's camera, or for the screenshare tile its screen, once the swarm says it is on.
  const remoteVideoEnabled = Boolean(isScreenshare ? user.tracks?.screenshareEnabled : user.tracks?.videoEnabled);
  const deviceKey = isScreenshare ? user.id?.slice(0, -SCREENSHARE_SUFFIX.length) : user.id;
  const pulledVideoStream = useAtomValue(
    call.videoStreamAtom(
      !isSelf && remoteVideoEnabled ? deviceKey : undefined,
      isScreenshare ? 'screenshare' : 'video',
    ),
  );

  const videoStream = useMemo<MediaStream | undefined>(() => {
    if (isSelf) {
      return isScreenshare ? screenshareVideoStream : localVideoStream;
    }
    return pulledVideoStream;
  }, [isSelf, isScreenshare, localVideoStream, screenshareVideoStream, pulledVideoStream]);

  // For self tiles use local media state; for remote tiles use the participant's swarm-reported state.
  // Self screenshare tiles gate on screenshareVideoStream, not camera state.
  const participantVideo = isSelf
    ? isScreenshare
      ? Boolean(screenshareVideoStream)
      : videoEnabled
    : remoteVideoEnabled;

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
        // The local stream outlives its camera track, so only a tile whose video is on gets a stream.
        videoStream={participantVideo ? videoStream : undefined}
        flip={isSelf && !isScreenshare}
        contain={!!isScreenshare}
        classNames='rounded-md'
      />
    </ResponsiveGridItem>
  );
});

Participant.displayName = 'Participant';
