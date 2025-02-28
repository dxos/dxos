//
// Copyright 2024 DXOS.org
//

import { log } from '@dxos/log';

import { getDeviceList } from './get-device-list';

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
  return navigator.mediaDevices
    .getUserMedia(
      device.kind === 'videoinput' ? { video: { ...constraints, deviceId } } : { audio: { ...constraints, deviceId } },
    )
    .then(async (mediaStream) => {
      return device.kind === 'videoinput' ? mediaStream.getVideoTracks()[0] : mediaStream.getAudioTracks()[0];
    });
};
