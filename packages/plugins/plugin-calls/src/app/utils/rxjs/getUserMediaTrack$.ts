//
// Copyright 2024 DXOS.org
//

import type { Subscriber } from 'rxjs';
import { Observable, combineLatest, concat, distinctUntilChanged, map, of, switchMap } from 'rxjs';

import { log } from '@dxos/log';

import { getDeviceListObservable } from './getDeviceListObservable';

class DevicesExhaustedError extends Error {
  constructor(message?: string) {
    super(message);
    this.name = this.constructor.name;
  }
}

export const getUserMediaTrack$ = (
  kind: MediaDeviceKind,
  constraints$: Observable<MediaTrackConstraints> = of({}),
  deviceList$: Observable<MediaDeviceInfo[]> = getDeviceListObservable(),
): Observable<MediaStreamTrack> => {
  return combineLatest([
    deviceList$.pipe(
      map((list) => list.filter((d) => d.kind === kind)),
      distinctUntilChanged((a, b) => JSON.stringify(a) === JSON.stringify(b)),
    ),
    constraints$,
  ]).pipe(
    // switchMap on the outside here will cause a new
    switchMap(([deviceList, constraints]) => {
      // concat here is going to make these be subscribed
      // to sequentially
      return concat(
        ...deviceList
          .filter((d) => d.kind === kind)
          .map((device) => {
            return new Observable<MediaStreamTrack>((subscriber) => {
              const cleanupRef = { current: () => {} };
              acquireTrack(subscriber, device, constraints, cleanupRef);
              return () => {
                cleanupRef.current();
              };
            });
          }),
        new Observable<MediaStreamTrack>((sub) => sub.error(new DevicesExhaustedError())),
      );
    }),
  );
};

const acquireTrack = (
  subscriber: Subscriber<MediaStreamTrack>,
  device: MediaDeviceInfo,
  constraints: MediaTrackConstraints,
  cleanupRef: { current: () => void },
) => {
  const { deviceId, label } = device;
  log.info(`🙏🏻 Requesting ${label}`);
  navigator.mediaDevices
    .getUserMedia(
      device.kind === 'videoinput' ? { video: { ...constraints, deviceId } } : { audio: { ...constraints, deviceId } },
    )
    .then(async (mediaStream) => {
      const track = device.kind === 'videoinput' ? mediaStream.getVideoTracks()[0] : mediaStream.getAudioTracks()[0];
      const cleanup = () => {
        log.info('🛑 Stopping track');
        track.stop();
      };
      cleanupRef.current = cleanup;
      subscriber.next(track);
      track.addEventListener('ended', () => {
        log.info('🔌 Track ended abrubptly');
        subscriber.complete();
      });
    })
    .catch((err) => {
      // this device is in use already, probably on Windows
      // so we can just call this one complete and move on
      if (err instanceof Error && err.name === 'NotReadable') {
        subscriber.complete();
      } else {
        subscriber.error(err);
      }
    });
};
