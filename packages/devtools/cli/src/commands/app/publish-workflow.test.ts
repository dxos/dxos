//
// Copyright 2023 DXOS.org
//

import { expect, test } from '@oclif/test';
import * as fs from 'fs-extra';
import yaml from 'js-yaml';
import path from 'path';

import { describe } from '@dxos/test';

describe.skip('App', () => {
  const configPath = path.join(__dirname, '../../../config/config-local.yml');
  const config = yaml.load(String(fs.readFileSync(configPath))) as any;

  const tmpFolder = './tmp/dx';

  test
    .stdout()
    .stderr()
    .stdin(`mkdir -p ${tmpFolder}`)
    .stdin(`pushd ${tmpFolder}`)

    .command(['app create', 'test-app', '--json', '--config', configPath])
    .command(['app publish', '--configPath', './test-app/dx.yml', '--config', configPath])
    .command(['app list', '--config', configPath])

    .stdin('popd')

    .it('Create and publish app', (ctx) => {
      console.log(ctx.stderr);
      console.log(ctx.stdout);
      expect(JSON.stringify(JSON.parse(ctx.stdout))).to.equal(JSON.stringify(config));
    });
});
