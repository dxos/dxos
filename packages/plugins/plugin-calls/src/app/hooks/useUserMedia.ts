//
// Copyright 2024 DXOS.org
//

import { useMemo, useState } from 'react';
import { combineLatest, map, of, shareReplay, switchMap, tap } from 'rxjs';

import { useStateObservable, useSubscribedState } from './rxjsHooks';
import { blackCanvasStreamTrack } from '../utils/blackCanvasStreamTrack';
import { getUserMediaTrack$ } from '../utils/rxjs/getUserMediaTrack$';

const useUserMedia = () => {
  const [audioEnabled, setAudioEnabled] = useState(false);
  const [videoEnabled, setVideoEnabled] = useState(false);
  const [screenShareEnabled, setScreenShareEnabled] = useState(false);

  const turnMicOff = () => setAudioEnabled(false);
  const turnMicOn = () => setAudioEnabled(true);
  const turnCameraOn = () => setVideoEnabled(true);
  const turnCameraOff = () => setVideoEnabled(false);
  const startScreenShare = () => setScreenShareEnabled(true);
  const endScreenShare = () => setScreenShareEnabled(false);

  const videoEnabled$ = useStateObservable(videoEnabled);

  const videoTrack$ = useMemo(
    () =>
      videoEnabled$.pipe(
        switchMap((enabled) => (enabled ? getUserMediaTrack$('videoinput') : of(blackCanvasStreamTrack()))),
        shareReplay({
          refCount: true,
          bufferSize: 1,
        }),
      ),
    [videoEnabled$],
  );

  const videoTrack = useSubscribedState(videoTrack$);
  const videoDeviceId = videoTrack?.getSettings().deviceId;
  const audioTrack$ = useMemo(
    () =>
      getUserMediaTrack$('audioinput').pipe(
        shareReplay({
          refCount: true,
          bufferSize: 1,
        }),
      ),
    [],
  );
  const mutedAudioTrack$ = useMemo(() => {
    return getUserMediaTrack$('audioinput').pipe(
      tap({
        next: (track) => {
          track.enabled = false;
        },
      }),
      shareReplay({
        refCount: true,
        bufferSize: 1,
      }),
    );
  }, []);

  const alwaysOnAudioStreamTrack = useSubscribedState(audioTrack$);
  const audioDeviceId = alwaysOnAudioStreamTrack?.getSettings().deviceId;
  const audioEnabled$ = useStateObservable(audioEnabled);
  const publicAudioTrack$ = useMemo(
    () =>
      combineLatest([audioEnabled$, audioTrack$, mutedAudioTrack$]).pipe(
        map(([enabled, alwaysOnTrack, mutedTrack]) => (enabled ? alwaysOnTrack : mutedTrack)),
        shareReplay({
          refCount: true,
          bufferSize: 1,
        }),
      ),
    [audioEnabled$, audioTrack$, mutedAudioTrack$],
  );
  const audioStreamTrack = useSubscribedState(publicAudioTrack$);

  return {
    turnMicOn,
    turnMicOff,
    audioStreamTrack,
    audioMonitorStreamTrack: alwaysOnAudioStreamTrack,
    audioEnabled,
    publicAudioTrack$,
    privateAudioTrack$: audioTrack$,
    audioDeviceId,
    videoDeviceId,
    turnCameraOn,
    turnCameraOff,
    videoEnabled,
    videoTrack$,
    videoStreamTrack: videoTrack,

    startScreenShare,
    endScreenShare,
    screenShareEnabled,
  };
};

export default useUserMedia;
export type UserMedia = ReturnType<typeof useUserMedia>;
