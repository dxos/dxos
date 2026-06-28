//
// Copyright 2025 DXOS.org
//

import { useEffect, useState } from 'react';

/**
 * Acquires a microphone audio track while `active`. Re-acquires when the `constraints` change (e.g.
 * a different input device is selected) so the new device takes effect without a remount.
 */
// TODO(burdon): Reconcile with react-ui-experimental and plugin-calls.
export const useAudioTrack = (active?: boolean, constraints?: MediaTrackConstraints): MediaStreamTrack | undefined => {
  const [track, setTrack] = useState<MediaStreamTrack>();
  // Re-acquire on a value change, not on every re-created constraints object identity.
  const constraintsKey = constraints ? JSON.stringify(constraints) : '';
  useEffect(() => {
    if (!active) {
      track?.stop();
      setTrack(undefined);
      return;
    }

    let cancelled = false;
    let acquired: MediaStreamTrack | undefined;
    // Drop any previous (now-stopped) track while reacquiring, so callers never hold a dead track.
    setTrack(undefined);
    const initAudio = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: constraints ?? true });
        const [next] = stream.getAudioTracks();
        if (cancelled || !next) {
          next?.stop();
          return;
        }
        acquired = next;
        setTrack(next);
      } catch {
        // Permission denied / device unavailable: leave the track cleared rather than rejecting.
        if (!cancelled) {
          setTrack(undefined);
        }
      }
    };

    void initAudio();

    return () => {
      cancelled = true;
      acquired?.stop();
    };
    // `constraints` is read via the serialized `constraintsKey`.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, constraintsKey]);

  return track;
};
