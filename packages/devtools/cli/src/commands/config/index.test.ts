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
  const configPath = path.join(__dirname, '../../../config/config-default.yml');
  const config = yaml.load(String(fs.readFileSync(configPath))) as any;

  const { stdout } = await runCommand<{ name: string }>(`config --json --config ${configPath}}`);
  console.log(stdout);
  expect(JSON.stringify(JSON.parse(stdout))).to.equal(JSON.stringify(config));

  // test.ux
  //   .stdout()
  //   .command(['config', '--json', '--config', configPath])
  //   .it('runs config', (ctx) => {
  //     expect(JSON.stringify(JSON.parse(ctx.stdout))).to.equal(JSON.stringify(config));
  //   });
});
