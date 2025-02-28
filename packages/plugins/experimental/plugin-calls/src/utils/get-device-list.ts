//
// Copyright 2024 DXOS.org
//

// TODO(mykola): Handle devicechange event.
export const getDeviceList = () => navigator.mediaDevices.enumerateDevices();
