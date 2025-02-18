//
// Copyright 2025 DXOS.org
//

import { useRoomContext } from './useRoomContext';

export const useHandleCamera = () => {
  const {
    userMedia: { videoEnabled, turnCameraOff, turnCameraOn },
  } = useRoomContext();

  return {
    onClick: videoEnabled ? turnCameraOff : turnCameraOn,
    icon: videoEnabled ? 'ph--video-camera--regular' : 'ph--video-camera-slash--regular',
    label: videoEnabled ? 'Camera' : 'Camera Off',
  };
};
