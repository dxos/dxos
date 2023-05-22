//
// Copyright 2023 DXOS.org
//

import { ProcessDescription } from 'pm2';

import { getPm2 } from './pm2';

export const isDaemonRunning = async (profile = 'default'): Promise<boolean> => {
  const pm2 = await getPm2();

  const proc = await new Promise<ProcessDescription[]>((resolve, reject) => {
    pm2.describe(profile, (err, proc) => {
      if (err) {
        reject(err);
      } else {
        resolve(proc);
      }
    });
  });

  if (proc.length === 0) {
    return false;
  }

  if (!proc[0].monit?.cpu || !proc[0].monit?.memory) {
    return false;
  }

  return true;
};
