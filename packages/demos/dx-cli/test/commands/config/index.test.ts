//
// Copyright 2022 DXOS.org
//

import * as fs from 'fs-extra';
import yaml from 'js-yaml';
import path from 'path';
import { expect, test } from '@oclif/test';

// TODO(burdon): Import (configure esbuild).
// TODO(burdon): Lint issue.
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
// import config from '../../../config/config.yml';

describe('config', () => {
  const config = yaml.load(String(fs.readFileSync(path.join(__dirname, '../../../config/config.yml')))) as any;

  test
    .stdout()
    .command(['config', '--json', '--config', './config/config.yml'])
    .it('runs kube status', ctx => {
      expect(JSON.stringify(JSON.parse(ctx.stdout))).to.equal(JSON.stringify(config));
    });
});
