//
// Copyright 2024 DXOS.org
//
import { untracked } from '@preact/signals-core';
import { useEffect, useMemo, useRef } from 'react';

import { invariant } from '@dxos/invariant';
import { create } from '@dxos/live-object';
import { log } from '@dxos/log';

import { getScreenshare, getUserMediaTrack } from '../utils';

export type UserMedia = {
  state: {
    audioDeviceId?: string;
    audioEnabled?: boolean;
    audioTrack?: MediaStreamTrack;
    publicAudioTrack?: MediaStreamTrack;
    mutedAudioTrack?: MediaStreamTrack;

    videoDeviceId?: string;
    videoEnabled?: boolean;
    videoTrack?: MediaStreamTrack;

    screenshareEnabled?: boolean;
    screenshareVideoTrack?: MediaStreamTrack;
  };

  turnMicOn: () => void;
  turnMicOff: () => void;
  turnCameraOn: () => void;
  turnCameraOff: () => void;
  turnScreenshareOn: () => void;
  turnScreenshareOff: () => void;
};

// TOOD(burdon): Hard coded.
const VIDEO_WIDTH = 1280;
const VIDEO_HEIGHT = 720;

export const useUserMedia = (): UserMedia => {
  const state = useMemo(() => create<UserMedia['state']>({}), []);

  const turnMicOn = () => {
    state.audioEnabled = true;
  };
  const turnMicOff = () => {
    state.audioEnabled = false;
  };
  const turnCameraOn = () => {
    state.videoEnabled = true;
  };
  const turnCameraOff = () => {
    state.videoEnabled = false;
  };
  const turnScreenshareOn = () => {
    state.screenshareEnabled = true;
  };
  const turnScreenshareOff = () => {
    state.screenshareEnabled = false;
  };

  //
  // Audio
  //


  useEffect(() => {
    getUserMediaTrack('audioinput')
      .then((track) => {
        state.audioTrack = track;
        state.audioDeviceId = track.getSettings().deviceId;
      })
      .catch((err) => log.catch(err));

    getUserMediaTrack('audioinput')
      .then((track) => {
        track.enabled = false;
        state.mutedAudioTrack = track;
      })
      .catch((err) => log.catch(err));
  }, []);

  useEffect(() => {
    state.publicAudioTrack = state.audioEnabled ? state.audioTrack : state.mutedAudioTrack;
  }, [state.audioEnabled, state.audioTrack, state.mutedAudioTrack]);

  //
  // Video
  //

  const blackCanvasStreamTrack = useBlackCanvasStreamTrack();
  useEffect(() => {
    if (state.videoEnabled) {
      getUserMediaTrack('videoinput', { width: VIDEO_WIDTH, height: VIDEO_HEIGHT })
        .then((track) => {
          state.videoTrack = track;
          state.videoDeviceId = track.getSettings().deviceId;
        })
        .catch((err) => log.catch(err));
    } else {
      state.videoTrack = blackCanvasStreamTrack;
    }

    return () => {
      untracked(() => state.videoTrack?.stop());
    };
  }, [state.videoEnabled]);

  //
  // Screenshare
  //

  useEffect(() => {
    if (state.screenshareEnabled) {
      getScreenshare({ contentHint: 'text' })
        .then((ms) => {
          state.screenshareVideoTrack = ms?.getVideoTracks()[0];
        })
        .catch((err) => log.catch(err));
    } else {
      state.screenshareVideoTrack = undefined;
    }
  }, [state.screenshareEnabled]);

  return {
    state,
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
