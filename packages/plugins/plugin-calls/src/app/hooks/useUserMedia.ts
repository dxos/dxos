//
// Copyright 2024 DXOS.org
//

import { useMemo, useState } from 'react';
import { combineLatest, map, of, shareReplay, switchMap, tap } from 'rxjs';

import { invariant } from '@dxos/invariant';

import { useStateObservable, useSubscribedState } from './rxjsHooks';
import { blackCanvasStreamTrack } from '../utils/blackCanvasStreamTrack';
import { prependDeviceToPrioritizeList } from '../utils/rxjs/devicePrioritization';
import { getUserMediaTrack$ } from '../utils/rxjs/getUserMediaTrack$';

// export const userRejectedPermission = 'NotAllowedError'

export const errorMessageMap = {
  NotAllowedError: 'Permission was denied. Grant permission and reload to enable.',
  NotFoundError: 'No device was found.',
  NotReadableError: 'Device is already in use.',
  OverconstrainedError: 'No device was found that meets constraints.',
  DevicesExhaustedError: 'All devices failed to initialize.',
  UnknownError: 'An unknown error occurred.',
};

type UserMediaError = keyof typeof errorMessageMap;

const useUserMedia = () => {
  const [audioEnabled, setAudioEnabled] = useState(false);
  const [videoEnabled, setVideoEnabled] = useState(false);
  const [screenShareEnabled, setScreenShareEnabled] = useState(false);
  const [videoUnavailableReason, setVideoUnavailableReason] = useState<UserMediaError>();
  const [audioUnavailableReason, setAudioUnavailableReason] = useState<UserMediaError>();

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
        switchMap((enabled) =>
          enabled
            ? getUserMediaTrack$('videoinput').pipe(
                tap({
                  error: (e) => {
                    invariant(e instanceof Error);
                    setVideoUnavailableReason(e.name in errorMessageMap ? (e.name as UserMediaError) : 'UnknownError');
                  },
                }),
              )
            : of(blackCanvasStreamTrack()),
        ),
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
        tap({
          error: (e) => {
            invariant(e instanceof Error);
            setAudioUnavailableReason(e.name in errorMessageMap ? (e.name as UserMediaError) : 'UnknownError');
          },
        }),
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
        error: (e) => {
          invariant(e instanceof Error);
          setAudioUnavailableReason(e.name in errorMessageMap ? (e.name as UserMediaError) : 'UnknownError');
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

  const setVideoDeviceId = (deviceId: string) =>
    navigator.mediaDevices.enumerateDevices().then((devices) => {
      const device = devices.find((d) => d.deviceId === deviceId);
      if (device) {
        prependDeviceToPrioritizeList(device);
      }
    });

  const setAudioDeviceId = (deviceId: string) =>
    navigator.mediaDevices.enumerateDevices().then((devices) => {
      const device = devices.find((d) => d.deviceId === deviceId);
      if (device) {
        prependDeviceToPrioritizeList(device);
      }
    });

  return {
    turnMicOn,
    turnMicOff,
    audioStreamTrack,
    audioMonitorStreamTrack: alwaysOnAudioStreamTrack,
    audioEnabled,
    audioUnavailableReason,
    publicAudioTrack$,
    privateAudioTrack$: audioTrack$,
    audioDeviceId,
    setAudioDeviceId,

    setVideoDeviceId,
    videoDeviceId,
    turnCameraOn,
    turnCameraOff,
    videoEnabled,
    videoUnavailableReason,
    videoTrack$,
    videoStreamTrack: videoTrack,

    startScreenShare,
    endScreenShare,
    screenShareEnabled,
  };
};

export default useUserMedia;
export type UserMedia = ReturnType<typeof useUserMedia>;
