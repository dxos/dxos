//
// Copyright 2022 DXOS.org
//

import { expect, test } from '@oclif/test';

describe('kube:status', () => {
  test
    .stdout()
    .command(['kube:status'])
    .it('runs kube status', ctx => {
      expect(ctx.stdout).to.contain('200');
    });
});
