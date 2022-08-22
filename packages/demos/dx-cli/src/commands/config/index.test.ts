//
// Copyright 2022 DXOS.org
//

import { expect, test } from '@oclif/test';
import * as fs from 'fs-extra';
import yaml from 'js-yaml';
import path from 'path';

// TODO(burdon): Import (configure esbuild).
// TODO(burdon): Lint issue.
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
// import config from '../../../config/config.yml';

// TODO(burdon): SecurityError: localStorage is not available for opaque origins
describe('config', () => {
  const config = yaml.load(String(fs.readFileSync(path.join(__dirname, '../../../config/config.yml')))) as any;

  test
    .stdout()
    .command(['config', '--json', '--config', './config/config.yml'])
    .it('runs config', ctx => {
      expect(JSON.stringify(JSON.parse(ctx.stdout))).to.equal(JSON.stringify(config));
    });
});
