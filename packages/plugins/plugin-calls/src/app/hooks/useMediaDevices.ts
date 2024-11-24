//
// Copyright 2024 DXOS.org
//

import { useEffect } from 'react';
import { createGlobalState } from 'react-use';

import { log } from '@dxos/log';

const useMediaDevicesState = createGlobalState<MediaDeviceInfo[]>([]);

export default (filter: (device: MediaDeviceInfo) => boolean = () => true) => {
  const [devices, setDevices] = useMediaDevicesState();

  useEffect(() => {
    let mounted = true;
    const requestDevices = () => {
      navigator.mediaDevices
        .enumerateDevices()
        .then((d) => {
          if (mounted) {
            setDevices(d);
          }
        })
        .catch((err) => log.catch(err));
    };
    navigator.mediaDevices.addEventListener('devicechange', requestDevices);
    requestDevices();
    return () => {
      mounted = false;
      navigator.mediaDevices.removeEventListener('devicechange', requestDevices);
    };
  }, [setDevices]);

  return devices.filter(filter);
};
