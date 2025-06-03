//
// Copyright 2025 DXOS.org
//

import { useEffect, useState } from 'react';

/**
 *
 */
// TODO(burdon): Reconcile with react-ui-sfx and plugin-calls.
export const useAudioTrack = (active?: boolean, constraints?: MediaTrackConstraints): MediaStreamTrack | undefined => {
  const [track, setTrack] = useState<MediaStreamTrack>();
  useEffect(() => {
    if (!active) {
      track?.stop();
      setTrack(undefined);
      return;
    }

    const initAudio = async () => {
      const audio = new Audio();
      audio.srcObject = await navigator.mediaDevices.getUserMedia({ audio: constraints ?? true });
      const [track] = audio.srcObject.getAudioTracks();
      if (track) {
        setTrack(track);
      }
    };

    if (active) {
      void initAudio();
    }
  }, [active]);

  return track;
};
