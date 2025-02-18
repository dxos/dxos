//
// Copyright 2025 DXOS.org
//

import { useRoomContext } from './useRoomContext';

export const useHandleMic = () => {
  const {
    userMedia: { turnMicOn, turnMicOff, audioEnabled },
  } = useRoomContext();

  return {
    onClick: audioEnabled ? turnMicOff : turnMicOn,
    icon: audioEnabled ? 'ph--microphone--regular' : 'ph--microphone-slash--regular',
    label: audioEnabled ? 'Mic' : 'Mic Off',
  };
};
