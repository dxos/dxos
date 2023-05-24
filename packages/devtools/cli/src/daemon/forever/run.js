//
// Copyright 2023 DXOS.org
//

const forever = require('forever');
const { Monitor } = require('forever-monitor');

forever.load({ root: `${process.env.HOME}/.dx/store/forever` });

const monitor = new Monitor([
  './bin/dev',
  'daemon',
  'run',
  `--listen=unix://${process.env.HOME}/.dx/run/default.sock`,
  '--profile=default',
]);
monitor.start();
