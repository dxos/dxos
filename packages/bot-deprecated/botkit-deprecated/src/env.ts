//
// Copyright 2020 DXOS.org
//

import os from 'os';

// Supported environments.
export const NATIVE_ENV = 'native';
export const NODE_ENV = 'node';
export const BROWSER_ENV = 'browser';

/**
 * Get platform info.
 */
export const getPlatformInfo = () => {
  let platform = os.type().toLowerCase();
  platform = platform === 'darwin' ? 'macos' : platform;

  const arch = os.arch();

  return { platform, arch };
};
