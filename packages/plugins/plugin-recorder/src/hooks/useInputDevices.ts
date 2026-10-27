//
// Copyright 2026 DXOS.org
//

import { useEffect, useState } from 'react';

import { log } from '@dxos/log';

import { type InputDevice } from '../audio/devices.ts';

/**
 * The connected inputs of a kind, kept current as devices come and go. Labels are empty until the page has been
 * granted that kind of media once, so `refresh` is called again after a grant.
 */
export const useInputDevices = (kind: 'audioinput' | 'videoinput'): { devices: InputDevice[]; refresh: () => void } => {
  const [devices, setDevices] = useState<InputDevice[]>([]);
  const [version, setVersion] = useState(0);
  useEffect(() => {
    const mediaDevices = globalThis.navigator?.mediaDevices;
    if (!mediaDevices?.enumerateDevices) {
      return;
    }
    let cancelled = false;
    const list = () =>
      void mediaDevices
        .enumerateDevices()
        .then((all) => {
          if (!cancelled) {
            setDevices(
              all
                .filter((device) => device.kind === kind && device.deviceId)
                .map(({ deviceId, label }) => ({ deviceId, label })),
            );
          }
        })
        .catch((err) => log.catch(err));
    list();
    mediaDevices.addEventListener('devicechange', list);
    return () => {
      cancelled = true;
      mediaDevices.removeEventListener('devicechange', list);
    };
  }, [kind, version]);
  return { devices, refresh: () => setVersion((version) => version + 1) };
};
