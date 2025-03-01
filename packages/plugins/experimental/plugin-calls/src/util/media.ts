//
// Copyright 2025 DXOS.org
//

import { log } from '@dxos/log';

class DevicesExhaustedError extends Error {
  constructor(message?: string) {
    super(message);
    this.name = this.constructor.name;
  }
}

export const getUserMediaTrack = async (
  kind: MediaDeviceKind,
  constraints: MediaTrackConstraints = {},
  deviceList?: MediaDeviceInfo[],
): Promise<MediaStreamTrack> => {
  deviceList ??= (await getDeviceList()).filter((device) => device.kind === kind);
  const firstDevice = deviceList[0];
  if (!firstDevice) {
    throw new DevicesExhaustedError();
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

export const getScreenshare = async ({ contentHint }: { contentHint: string }) => {
  const ms = await navigator.mediaDevices.getDisplayMedia();
  ms.getVideoTracks().forEach((track) => {
    if (contentHint && 'contentHint' in track) {
      track.contentHint = contentHint;
    }
  });

  return ms;
};
