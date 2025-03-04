//
// Copyright 2024 DXOS.org
//
import { untracked } from '@preact/signals-core';
import { useEffect, useMemo } from 'react';

import { scheduleTask } from '@dxos/async';
import { Context } from '@dxos/context';
import { invariant } from '@dxos/invariant';
import { create } from '@dxos/live-object';

import { getScreenshare, getUserMediaTrack } from '../util';

export type UserMedia = {
  state: {
    audioDeviceId?: string;
    audioEnabled?: boolean;
    audioTrack?: MediaStreamTrack;

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
  // Obtain audio track.
  //
  useEffect(() => {
    const ctx = new Context();
    scheduleTask(ctx, async () => {
      if (state.audioEnabled) {
        const track = await getUserMediaTrack('audioinput');
        state.audioTrack = track;
        state.audioDeviceId = track.getSettings().deviceId;
      } else {
        state.audioTrack = undefined;
      }
    });

    return () => {
      void ctx.dispose();
      untracked(() => state.audioTrack?.stop());
    };
  }, [state.audioEnabled]);

  //
  // Obtain video track.
  //
  const blackCanvasStreamTrack = useBlackCanvasStreamTrack();
  useEffect(() => {
    const ctx = new Context();
    scheduleTask(ctx, async () => {
      if (state.videoEnabled) {
        const track = await getUserMediaTrack('videoinput', { width: VIDEO_WIDTH, height: VIDEO_HEIGHT });
        state.videoTrack = track;
        state.videoDeviceId = track.getSettings().deviceId;
      } else if (blackCanvasStreamTrack.readyState === 'live') {
        state.videoTrack = blackCanvasStreamTrack;
      }
    });

    return () => {
      void ctx.dispose();
      untracked(() => state.videoTrack?.stop());
    };
  }, [state.videoEnabled]);

  //
  // Obtain screenshare track.
  //
  useEffect(() => {
    const ctx = new Context();
    let ms: MediaStream | undefined;
    scheduleTask(ctx, async () => {
      if (state.screenshareEnabled) {
        ms = await getScreenshare({ contentHint: 'text' });
        state.screenshareVideoTrack = ms?.getVideoTracks()[0];
      } else {
        state.screenshareVideoTrack = undefined;
      }
    });

    return () => {
      void ctx.dispose();
      ms?.getTracks().forEach((t) => t.stop());
    };
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

    const ctx = canvas.getContext('2d');
    invariant(ctx);
    ctx.fillStyle = 'black';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

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
