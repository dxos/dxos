//
// Copyright 2024 DXOS.org
//

import { debounceTime, fromEvent, merge, switchMap } from 'rxjs';

export const getDeviceListObservable = () =>
  merge(
    navigator.mediaDevices.enumerateDevices(),
    fromEvent(navigator.mediaDevices, 'devicechange').pipe(
      debounceTime(1500),
      switchMap(() => navigator.mediaDevices.enumerateDevices()),
    ),
  );
