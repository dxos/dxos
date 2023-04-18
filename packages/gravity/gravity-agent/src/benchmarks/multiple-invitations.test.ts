//
// Copyright 2023 DXOS.org
//

import { describe, test } from '@dxos/test';

import { loadConfig } from '../utils';

describe('Multiple invitations', () => {
  test('N peers join in the same space', async () => {
    const numberOFPeers = 10;
    const config = loadConfig('./config.yml');
  }).tag('stress');
});
