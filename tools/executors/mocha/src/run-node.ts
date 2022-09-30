//
// Copyright 2022 DXOS.org
//

import glob from 'glob';
import Mocha from 'mocha';

export type NodeOptions = {
  testPatterns: string[]
  timeout: number
  checkLeaks: boolean
  signalServer: boolean
  domRequired: boolean
}

export const runNode = async (options: NodeOptions) => {
  const mocha = new Mocha({
    timeout: options.timeout,
    checkLeaks: options.checkLeaks
  });

  options.testPatterns.forEach(pattern => {
    glob.sync(pattern).forEach(path => {
      mocha.addFile(path);
    });
  });

  const failures = await new Promise(resolve => mocha.run(failures => resolve(failures)));

  return failures;
};
