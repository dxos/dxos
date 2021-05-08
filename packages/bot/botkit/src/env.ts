//
// Copyright 2020 DXOS.org
//

import assert from 'assert';
import get from 'lodash.get';
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
  platform = (platform === 'darwin' ? 'macos' : platform);

  const arch = os.arch();

  return { platform, arch };
};

export const getBotCID = (botRecord: string, env: string) => {
  let packageAttrName;
  switch (env) {
    case NATIVE_ENV: {
      const { platform, arch } = getPlatformInfo();
      packageAttrName = `${platform}.${arch}["/"]`;
      break;
    }
    case NODE_ENV: {
      packageAttrName = 'node["/"]';
      break;
    }
    default: {
      throw new Error(`Environment '${env}' not supported.`);
    }
  }
  const ipfsCID = get(botRecord, `attributes.package.${packageAttrName}`);
  assert(ipfsCID, `Package '${packageAttrName}' not found.`);

  return ipfsCID;
};
