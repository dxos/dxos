//
// Copyright 2026 DXOS.org
//

import { holdLastFrame, loadMediaFile } from '../calls/call-simulation.ts';

/**
 * Replaces the browser's camera and microphone with a video file, so the local tile of a story's call shows a
 * scripted participant. The file stays paused on its first frame until `start`; `restore` puts the real devices back.
 * `enumerateDevices` is replaced too, since plugin-calls refuses a kind it cannot enumerate.
 */
export const fakeUserMedia = async (src: string): Promise<{ start: () => Promise<void>; restore: () => void }> => {
  const audioContext = new AudioContext();
  const { video, videoTrack, audioTrack } = await loadMediaFile(audioContext, src).catch((err) => {
    void audioContext.close();
    throw err;
  });
  holdLastFrame(video);
  const mediaDevices = navigator.mediaDevices;
  const { getUserMedia, enumerateDevices } = mediaDevices;
  const devices = [
    { kind: 'videoinput', deviceId: 'fake-camera', label: 'Fake camera' },
    { kind: 'audioinput', deviceId: 'fake-microphone', label: 'Fake microphone' },
  ] as const;

  mediaDevices.enumerateDevices = async () =>
    devices.map((device) => ({ ...device, groupId: 'fake', toJSON: () => device }));
  mediaDevices.getUserMedia = async (constraints) =>
    new MediaStream([
      ...(constraints?.video ? [videoTrack.clone()] : []),
      ...(constraints?.audio ? [audioTrack.clone()] : []),
    ]);

  return {
    start: async () => {
      await audioContext.resume();
      video.currentTime = 0;
      await video.play();
    },
    restore: () => {
      mediaDevices.getUserMedia = getUserMedia;
      mediaDevices.enumerateDevices = enumerateDevices;
      video.pause();
      video.remove();
      void audioContext.close();
    },
  };
};
