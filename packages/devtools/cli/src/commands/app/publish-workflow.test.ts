//
// Copyright 2023 DXOS.org
//

import { expect, test } from '@oclif/test';
import * as fs from 'fs-extra';
import yaml from 'js-yaml';
import path from 'path';

import { describe } from '@dxos/test';

import { exec } from '../../util/exec';

describe.skip('App', () => {
  const configPath = path.join(__dirname, '../../../config/config-local.yml');
  const config = yaml.load(String(fs.readFileSync(configPath))) as any;

  const tmpFolder = '/tmp/dx';

  test
    .stdout()
    .do(async () => {
      await exec(`pushd ${tmpFolder} > /dev/null `);
    })
    .command(['app create', 'test-app', '--json', '--config', configPath], { root: tmpFolder })

    .command(['app publish', '--config', configPath])
    .command(['app list', '--config', configPath])
    .do(async () => {
      await exec('popd > /dev/null');
      await exec(`rm -rf ${tmpFolder}`);
    })
    .it('Create and publish app', (ctx) => {
      console.log(ctx.stdout);
      expect(JSON.stringify(JSON.parse(ctx.stdout))).to.equal(JSON.stringify(config));
    });
});
