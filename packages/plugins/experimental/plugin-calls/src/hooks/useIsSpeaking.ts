//
// Copyright 2025 DXOS.org
//

import { useEffect, useRef, useState } from 'react';

import { monitorAudioLevel } from '../util';

export const useIsSpeaking = (mediaStreamTrack?: MediaStreamTrack) => {
  const [isSpeaking, setIsSpeaking] = useState(false);

  // The audio level is monitored very rapidly, and we don't want
  // react involved in tracking the state because it causes way
  // too many re-renders. To work around this, we use the isSpeakingRef
  // to track the state and then sync it using another effect.
  const isSpeakingRef = useRef(isSpeaking);

  // This effect syncs the state on a 50ms interval.
  useEffect(() => {
    if (!mediaStreamTrack) {
      setIsSpeaking(false);
      return;
    }

    isSpeakingRef.current = isSpeaking;

    // Update reactive state with debounce.
    const interval = window.setInterval(() => {
      // If state is already in sync do nothing.
      if (isSpeaking === isSpeakingRef.current) {
        return;
      }

      // Update reactive state with current live state.
      setIsSpeaking(isSpeakingRef.current);
    }, 50);

    return () => {
      clearInterval(interval);
    };
  }, [isSpeaking, isSpeakingRef, mediaStreamTrack]);

  useEffect(() => {
    if (!mediaStreamTrack) {
      return;
    }

    let timeout = -1;
    const cleanup = monitorAudioLevel({
      mediaStreamTrack,
      onMeasure: (vol) => {
        // Once the user has been determined to be speaking, we want
        // to lower the threshold because speech patterns don't always
        // kick up above 0.05.
        const audioLevelAboveThreshold = vol > (isSpeakingRef.current ? 0.02 : 0.05);
        if (audioLevelAboveThreshold) {
          // User is still speaking, clear timeout & reset.
          clearTimeout(timeout);
          timeout = -1;
          // Live state of the media stream track.
          isSpeakingRef.current = true;
        } else if (timeout === -1) {
          // User is not speaking and timeout is not set.
          timeout = window.setTimeout(() => {
            isSpeakingRef.current = false;
            timeout = -1;
          }, 1_000);
        }
      },
    });

    return () => {
      cleanup();
    };
  }, [isSpeaking, mediaStreamTrack]);

  return isSpeaking;
};
