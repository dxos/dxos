//
// Copyright 2023 DXOS.org
//

import forever from 'forever';
import fomonitor from 'forever-monitor';

export const getForever = () => {
  forever.load({ root: `${process.env.HOME}/.dx/store/forever` });
  const monitor = forever.start([
    './bin/dev',
    'daemon',
    'run',
    `--listen=unix://${process.env.HOME}/.dx/run/default.sock`,
    '--profile=default',
  ]);

  forever.startServer(monitor);
  monitor.start();
  forever.startDaemon();

  console.log('1');

  return forever;
};

getForever();
