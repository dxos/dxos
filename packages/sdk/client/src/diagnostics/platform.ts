//
// Copyright 2022 DXOS.org
//

export type Platform = {
  type: 'browser' | 'node';
  platform: string;
  runtime?: string;
};

export const getPlatform = async (): Promise<Platform> => {
  if (typeof window !== 'undefined') {
    const { userAgent } = window.navigator;
    return {
      type: 'browser',
      platform: userAgent,
    };
  }

  // https://nodejs.org/api/os.html
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { machine, platform, release } = require('node:os');
    return {
      type: 'node',
      platform: `${platform()} ${release()} ${machine()}`,
      runtime: process.version,
    };
  } catch (err) {
    // TODO(burdon): Fails in CI; ERROR: Could not resolve "node:os"
    return {
      type: 'node',
      platform: '',
    };
  }
};
