//
// Copyright 2023 DXOS.org
//

const notAvailable = () => {
  throw new Error('Not available on this platform');
};

export const appendFileSync = () => notAvailable();
export const mkdirSync = () => notAvailable();
export const openSync = () => notAvailable();
export const existsSync = () => notAvailable();
export const statSync = () => notAvailable();

export default {
  appendFileSync,
  mkdirSync,
  openSync,
  existsSync,
  statSync,
};
