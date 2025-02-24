//
// Copyright 2024 DXOS.org
//

import { useCallback, useEffect, useMemo, useState } from 'react';
import { combineLatest, map, type Observable, of, shareReplay, switchMap, tap } from 'rxjs';

import { invariant } from '@dxos/invariant';

import { useStateObservable, useSubscribedState } from './utils';
import { getScreenshare$, getUserMediaTrack$ } from '../utils';

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

  screenshareEnabled: boolean;
  screenshareVideoTrack: MediaStreamTrack | undefined;
  screenshareVideoTrack$: Observable<MediaStreamTrack | undefined>;

  turnMicOn: () => void;
  turnMicOff: () => void;
  turnCameraOn: () => void;
  turnCameraOff: () => void;
  turnScreenshareOn: () => void;
  turnScreenshareOff: () => void;
};

const VIDEO_WIDTH = 1280;
const VIDEO_HEIGHT = 720;

export const useUserMedia = (): UserMedia => {
  const [audioEnabled, setAudioEnabled] = useState(false);
  const [videoEnabled, setVideoEnabled] = useState(false);

  const turnMicOn = () => setAudioEnabled(true);
  const turnMicOff = () => setAudioEnabled(false);
  const turnCameraOn = () => setVideoEnabled(true);
  const turnCameraOff = () => setVideoEnabled(false);
  const [screenshareEnabled, setScreenshareEnabled] = useState(false);
  const turnScreenshareOn = useCallback(() => setScreenshareEnabled(true), []);
  const turnScreenshareOff = useCallback(() => setScreenshareEnabled(false), []);

  //
  // Audio
  //

  const audioTrack$ = useMemo(
    () => getUserMediaTrack$('audioinput').pipe(shareReplay({ refCount: true, bufferSize: 1 })),
    [],
  );
  const mutedAudioTrack$ = useMemo(() => {
    return getUserMediaTrack$('audioinput').pipe(
      tap({
        next: (track) => {
          track.enabled = false;
        },
      }),
      shareReplay({ refCount: true, bufferSize: 1 }),
    );
  }, []);

  const audioMonitorTrack = useSubscribedState(audioTrack$);
  const audioDeviceId = audioMonitorTrack?.getSettings().deviceId;

  const audioEnabled$ = useStateObservable(audioEnabled);
  const publicAudioTrack$ = useMemo(
    () =>
      combineLatest([audioEnabled$, audioTrack$, mutedAudioTrack$]).pipe(
        map(([enabled, alwaysOnTrack, mutedTrack]) => (enabled ? alwaysOnTrack : mutedTrack)),
        shareReplay({ refCount: true, bufferSize: 1 }),
      ),
    [audioEnabled$, audioTrack$, mutedAudioTrack$],
  );
  const audioTrack = useSubscribedState(publicAudioTrack$);

  //
  // Video
  //

  const blackCanvasStreamTrack = useBlackCanvasStreamTrack();
  const videoEnabled$ = useStateObservable(videoEnabled);
  const videoTrack$ = useMemo(
    () =>
      videoEnabled$.pipe(
        switchMap((enabled) =>
          enabled
            ? getUserMediaTrack$('videoinput', of({ width: VIDEO_WIDTH, height: VIDEO_HEIGHT }))
            : of(blackCanvasStreamTrack),
        ),
        shareReplay({ refCount: true, bufferSize: 1 }),
      ),
    [videoEnabled$],
  );
  const videoTrack = useSubscribedState(videoTrack$);
  const videoDeviceId = videoTrack?.getSettings().deviceId;

  //
  // Screenshare
  //

  const screenshareVideoTrack$ = useMemo(
    () =>
      screenshareEnabled
        ? getScreenshare$({ contentHint: 'text' }).pipe(
            tap({
              next: (ms) => {
                if (ms === undefined) {
                  setScreenshareEnabled(false);
                }
              },
              finalize: () => setScreenshareEnabled(false),
            }),
            map((ms) => ms?.getVideoTracks()[0]),
          )
        : of(undefined),
    [screenshareEnabled],
  );
  const screenshareVideoTrack = useSubscribedState(screenshareVideoTrack$);

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

    screenshareEnabled,
    screenshareVideoTrack,
    screenshareVideoTrack$,

    turnMicOn,
    turnMicOff,
    turnCameraOn,
    turnCameraOff,
    turnScreenshareOn,
    turnScreenshareOff,
  };
};

const useBlackCanvasStreamTrack = (videoTrack?: MediaStreamTrack) => {
  const canvas = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = VIDEO_WIDTH;
    canvas.height = VIDEO_HEIGHT;
    return canvas;
  }, [videoTrack]);

  useEffect(() => {
    const ctx = canvas.getContext('2d');
    invariant(ctx);
    ctx.fillStyle = 'black';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // We need to draw to the canvas in order for video frames to be sent on the video track.
    const i = setInterval(() => {
      ctx.fillStyle = 'black';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }, 1_000);

    return () => clearInterval(i);
  }, [canvas]);

  return canvas.captureStream().getVideoTracks()[0];
};
