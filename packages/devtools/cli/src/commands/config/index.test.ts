//
// Copyright 2022 DXOS.org
//

import { runCommand } from '@oclif/test';
import { expect } from 'chai';
import * as fs from 'fs-extra';
import yaml from 'js-yaml';
import path from 'path';

import { test } from '@dxos/test';

// TODO(burdon): Import (configure esbuild).
// TODO(burdon): Lint issue.
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
// import config from '../../../config/config.yml';

// TODO(burdon): SecurityError: localStorage is not available for opaque origins
test('config', async () => {
  const root = path.join(__dirname, '../../../');
  const configPath = path.join(root, '../cli-base/config/config-default.yml');
  const config = yaml.load(String(fs.readFileSync(configPath))) as any;

  const { stdout } = await runCommand(['config', '--json', '--config', configPath], {
    root,
  });

  expect(JSON.stringify(JSON.parse(stdout))).to.equal(JSON.stringify(config));
});
