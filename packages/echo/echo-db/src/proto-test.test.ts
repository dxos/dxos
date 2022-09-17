//
// Copyright 2021 DXOS.org
//

import { Config } from '@dxos/protocols/proto/dxos/config';

describe('Protos', () => {
  it('test protos', () => {
    const config: Config = {
      version: 1
    };

    console.log(JSON.stringify(config));
  });
});
