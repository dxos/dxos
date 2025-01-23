//
// Copyright 2024 DXOS.org
//

import { log } from '@dxos/log';

import { blackCanvasStreamTrack } from './blackCanvasStreamTrack';

export const getDeviceList = () => navigator.mediaDevices.enumerateDevices();

export const getUserMediaTrack = async (
  kind: MediaDeviceKind,
  constraints: MediaTrackConstraints ={},
  deviceList?: MediaDeviceInfo[],
): Promise<MediaStreamTrack> => {
  if (!deviceList) {
    deviceList = await getDeviceList();
  }

  const device = deviceList.find((d) => d.kind === kind);
  if (!device) {
    log.info('No device found', {deviceList, kind});
    return blackCanvasStreamTrack();
  }

  return acquireTrack(device, constraints);
};

const acquireTrack = async (
  device: MediaDeviceInfo,
  constraints: MediaTrackConstraints,
  cleanupRef?: { current: () => void },
): Promise<MediaStreamTrack> => {
  const { deviceId, label } = device;
  log.info(`🙏🏻 Requesting ${label}`);
  return navigator.mediaDevices
    .getUserMedia(
      device.kind === 'videoinput' ? { video: { ...constraints, deviceId } } : { audio: { ...constraints, deviceId } },
    )
    .then(async (mediaStream) => {
      const track = device.kind === 'videoinput' ? mediaStream.getVideoTracks()[0] : mediaStream.getAudioTracks()[0];
      track.addEventListener('ended', () => {
        log.info('🔌 Track ended abrubptly');
      });
      return track;
    })
};
