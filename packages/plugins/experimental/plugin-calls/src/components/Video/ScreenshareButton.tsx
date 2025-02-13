//
// Copyright 2025 DXOS.org
//

import React, { type FC } from 'react';
import { useEffect, useState } from 'react';

import { Button, Icon } from '@dxos/react-ui';

import { useRoomContext } from '../../hooks';

interface ScreenshareButtonProps {}

export const ScreenshareButton: FC<ScreenshareButtonProps> = () => {
  const {
    userMedia: { screenShareVideoTrack, turnScreenShareOn, turnScreenShareOff, screenShareEnabled },
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

  if (!canShareScreen) {
    return null;
  }

  return (
    <Button variant='default' disabled={otherUserIsSharing} onClick={sharing ? turnScreenShareOff : turnScreenShareOn}>
      <Icon icon={sharing ? 'ph--selection--regular' : 'ph--selection-slash--regular'} />
    </Button>
  );
};
