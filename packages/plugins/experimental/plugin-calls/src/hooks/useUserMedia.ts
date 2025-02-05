//
// Copyright 2024 DXOS.org
//

import { useMemo, useState } from 'react';
import { combineLatest, map, type Observable, of, shareReplay, switchMap, tap } from 'rxjs';

import { useStateObservable, useSubscribedState } from './utils';
import { getUserMediaTrack$, blackCanvasStreamTrack } from '../utils';

export type UserMedia = {
  audioDeviceId: string | undefined;
  audioEnabled: boolean;
  audioTrack: MediaStreamTrack;
  audioMonitorTrack: MediaStreamTrack;
  audioTrack$: Observable<MediaStreamTrack>;
  publicAudioTrack$: Observable<MediaStreamTrack>;

  videoDeviceId: string | undefined;
  videoEnabled: boolean;
  videoTrack: MediaStreamTrack;
  videoTrack$: Observable<MediaStreamTrack>;
  screenShareEnabled: boolean;

  turnMicOn: () => void;
  turnMicOff: () => void;
  turnCameraOn: () => void;
  turnCameraOff: () => void;
  turnScreenShareOn: () => void;
  turnScreenShareOff: () => void;
};

export const useUserMedia = (): UserMedia => {
  const [audioEnabled, setAudioEnabled] = useState(false);
  const [videoEnabled, setVideoEnabled] = useState(false);
  const [screenShareEnabled, setScreenShareEnabled] = useState(false);

  const turnMicOn = () => setAudioEnabled(true);
  const turnMicOff = () => setAudioEnabled(false);
  const turnCameraOn = () => setVideoEnabled(true);
  const turnCameraOff = () => setVideoEnabled(false);
  const turnScreenShareOn = () => setScreenShareEnabled(true);
  const turnScreenShareOff = () => setScreenShareEnabled(false);

  //
  // Audio
  //

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

  const audioMonitorTrack = useSubscribedState(audioTrack$);
  const audioDeviceId = audioMonitorTrack?.getSettings().deviceId;

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
  const audioTrack = useSubscribedState(publicAudioTrack$);

  //
  // Video
  //

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

  return {
    audioDeviceId,
    audioEnabled,
    audioTrack,
    audioTrack$,
    publicAudioTrack$,
    audioMonitorTrack,

    videoDeviceId,
    videoEnabled,
    videoTrack,
    videoTrack$,
    screenShareEnabled,

    turnMicOn,
    turnMicOff,
    turnCameraOn,
    turnCameraOff,
    turnScreenShareOn,
    turnScreenShareOff,
  };
};
