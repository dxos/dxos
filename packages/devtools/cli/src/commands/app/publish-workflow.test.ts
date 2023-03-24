//
// Copyright 2023 DXOS.org
//

import { expect, test } from '@oclif/test';
import * as fs from 'fs-extra';
import yaml from 'js-yaml';
import path from 'path';

import { describe } from '@dxos/test';

// TODO(burdon): Import (configure esbuild).
// TODO(burdon): Lint issue.
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
// import config from '../../../config/config.yml';

// TODO(burdon): SecurityError: localStorage is not available for opaque origins
describe('App', () => {
  const configPath = path.join(__dirname, '../../../config/config-local.yml');
  const config = yaml.load(String(fs.readFileSync(configPath))) as any;

  const appPath = '/tmp/dx/test-app';

  test
    .stdout()
    .command(['app create', appPath, '--json', '--config', configPath])
    .command(['app publish', '--configPath', `${appPath}/dx.yml`, '--config', configPath])
    .command(['app list', '--config', configPath])
    .it('Create and publish app', (ctx) => {
      console.log(ctx.stdout);
      expect(JSON.stringify(JSON.parse(ctx.stdout))).to.equal(JSON.stringify(config));
    });
});
