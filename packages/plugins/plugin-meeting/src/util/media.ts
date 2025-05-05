//
// Copyright 2025 DXOS.org
//

import { log } from '@dxos/log';

export const getUserMediaTrack = async (
  kind: MediaDeviceKind,
  constraints: MediaTrackConstraints = {},
  deviceList?: MediaDeviceInfo[],
): Promise<MediaStreamTrack> => {
  deviceList ??= (await getDeviceList()).filter((device) => device.kind === kind);
  const firstDevice = deviceList[0];
  if (!firstDevice) {
    throw new Error('No devices found');
  }

  return acquireTrack(firstDevice, constraints);
};

const acquireTrack = async (device: MediaDeviceInfo, constraints: MediaTrackConstraints): Promise<MediaStreamTrack> => {
  const { deviceId, label } = device;
  log.info(`requesting ${label}`);

  const mediaStream = await navigator.mediaDevices.getUserMedia(
    device.kind === 'videoinput' ? { video: { ...constraints, deviceId } } : { audio: { ...constraints, deviceId } },
  );
  return device.kind === 'videoinput' ? mediaStream.getVideoTracks()[0] : mediaStream.getAudioTracks()[0];
};

// TODO(mykola): Handle devicechange event.
export const getDeviceList = () => navigator.mediaDevices.enumerateDevices();

const SCREENSHARE_CONSTRAINTS = {
  video: {
    width: { max: 1920 },
    height: { max: 1080 },
    frameRate: { max: 10 },
  },
};

export const getScreenshare = async ({ contentHint }: { contentHint: string }) => {
  // Get 1080p equivalent screenshare with 10fps, but save natural sharing content aspect ratio.
  const ms = await navigator.mediaDevices.getDisplayMedia(SCREENSHARE_CONSTRAINTS);
  ms.getVideoTracks().forEach((track) => {
    if (contentHint && 'contentHint' in track) {
      track.contentHint = contentHint;
    }
  });

  return ms;
};
