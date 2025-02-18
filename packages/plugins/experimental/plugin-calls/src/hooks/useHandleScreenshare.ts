//
// Copyright 2025 DXOS.org
//

import { useEffect, useState } from 'react';

import { useRoomContext } from './useRoomContext';

export const useHandleScreenshare = () => {
  const {
    userMedia: { screenShareVideoTrack, turnScreenShareOn, turnScreenShareOff },
    room: { otherUsers },
  } = useRoomContext();

  const otherUserIsSharing = otherUsers.some((u) => u.tracks?.screenshare);

  const sharing = screenShareVideoTrack !== undefined;

  const [canShareScreen, setCanShareScreen] = useState(true);

  // setting this in a useEffect because we need to do this feature
  // detection to remove it for iOS, but the feature detection also
  // doesn't work on the server, so it causes a mismatch between
  // the server/client that React doesn't like
  useEffect(() => {
    setCanShareScreen(
      typeof navigator.mediaDevices !== 'undefined' && navigator.mediaDevices.getDisplayMedia !== undefined,
    );
  }, []);

  return {
    onClick: sharing ? turnScreenShareOff : turnScreenShareOn,
    disabled: !canShareScreen || otherUserIsSharing,
    icon: sharing ? 'ph--selection--regular' : 'ph--selection-slash--regular',
    label: sharing ? 'Screenshare' : 'Screenshare Off',
  };
};
