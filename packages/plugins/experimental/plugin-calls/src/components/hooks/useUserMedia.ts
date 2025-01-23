//
// Copyright 2024 DXOS.org
//

import { useMemo, useState } from 'react';

import { usePromise } from './usePromise';
import { blackCanvasStreamTrack } from '../utils/blackCanvasStreamTrack';
import { getUserMediaTrack } from '../utils/getUserMediaTrack';

export const useUserMedia = () => {
  const [audioEnabled, setAudioEnabled] = useState(false);
  const [videoEnabled, setVideoEnabled] = useState(false);
  const [screenShareEnabled, setScreenShareEnabled] = useState(false);

  const turnMicOff = () => setAudioEnabled(false);
  const turnMicOn = () => setAudioEnabled(true);
  const turnCameraOn = () => setVideoEnabled(true);
  const turnCameraOff = () => setVideoEnabled(false);
  const startScreenShare = () => setScreenShareEnabled(true);
  const endScreenShare = () => setScreenShareEnabled(false);

  const videoTrackPromise = useMemo(
    async () => (videoEnabled ? getUserMediaTrack('videoinput') : blackCanvasStreamTrack()),
    [videoEnabled],
  );

  const videoTrack = usePromise(videoTrackPromise);
  const videoDeviceId = videoTrack?.getSettings().deviceId;

  const audioTrackPromise = useMemo(() => getUserMediaTrack('audioinput'), []);
  const alwaysOnAudioTrack = usePromise(audioTrackPromise);

  const mutedAudioTrackPromise = useMemo(
    () =>
      getUserMediaTrack('audioinput').then((track) => {
        track.enabled = false;
        return track;
      }),
    [],
  );

  const publicAudioTrackPromise = useMemo(
    () => (audioEnabled ? audioTrackPromise : mutedAudioTrackPromise),
    [audioEnabled, audioTrackPromise, mutedAudioTrackPromise],
  );
  const publicAudioTrack = usePromise(publicAudioTrackPromise);

  const audioDeviceId = publicAudioTrack?.getSettings().deviceId;

  return {
    turnMicOn,
    turnMicOff,
    audioPromise: audioTrackPromise,
    audioStreamTrack: publicAudioTrack,
    audioMonitorStreamTrack: alwaysOnAudioTrack,
    audioEnabled,
    publicAudioTrackPromise,
    privateAudioTrackPromise: audioTrackPromise,
    audioDeviceId,
    videoDeviceId,
    turnCameraOn,
    turnCameraOff,
    videoEnabled,
    videoStreamTrack: videoTrack,
    videoPromise: videoTrackPromise,

    startScreenShare,
    endScreenShare,
    screenShareEnabled,
  };
};

export type UserMedia = ReturnType<typeof useUserMedia>;
