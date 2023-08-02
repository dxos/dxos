//
// Copyright 2023 DXOS.org
//

const notAvailable = () => {
  throw new Error('Not available on this platform');
};

export const randomBytes = () => notAvailable();
