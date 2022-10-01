//
// Copyright 2022 DXOS.org
//

import glob from 'glob';
import Mocha from 'mocha';
import { join } from 'path';

export type NodeOptions = {
  testPatterns: string[]
  resultsPath: string
  timeout: number
  signalServer: boolean
  domRequired: boolean
  checkLeaks: boolean
}

export const runNode = async (name: string, options: NodeOptions) => {
  const mocha = new Mocha({
    timeout: options.timeout,
    checkLeaks: options.checkLeaks,
    reporter: 'mocha-multi-reporters',
    reporterOptions: {
      reporterEnabled: 'spec, mocha-junit-reporter',
      mochaJunitReporterReporterOptions: {
        mochaFile: join(options.resultsPath, 'nodejs.xml'),
        testsuitesTitle: `${name} nodejs Tests`
      }
    }
  });

  options.testPatterns.forEach(pattern => {
    glob.sync(pattern).forEach(path => {
      mocha.addFile(path);
    });
  });

  const failures = await new Promise(resolve => mocha.run(failures => resolve(failures)));

  return !failures;
};
