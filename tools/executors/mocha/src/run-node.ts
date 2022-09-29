//
// Copyright 2022 DXOS.org
//

import glob from 'glob';
import Mocha from 'mocha';

import { runSetup } from './util';

export type NodeOptions = {
  testPatterns: string[]
  timeout: number
  signalServer: boolean
  domRequired: boolean
}

export const runNode = async (options: NodeOptions) => {
  const mocha = new Mocha({ timeout: options.timeout });

  await runSetup([
    '../setup/mocha-env',
    '../setup/react-setup',
    '../setup/catch-unhandled-rejections',
    ...(options.signalServer ? ['../setup/create-signal-server'] : []),
    ...(options.domRequired ? ['../setup/dom-setup'] : [])
  ]);

  options.testPatterns.forEach(pattern => {
    glob.sync(pattern).forEach(path => {
      mocha.addFile(path);
    });
  });

  const failures = await new Promise(resolve => mocha.run(failures => resolve(failures)));

  return failures;
};
