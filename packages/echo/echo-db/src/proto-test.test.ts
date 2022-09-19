//
// Copyright 2021 DXOS.org
//

import { Config as ConfigType } from '@dxos/protocols/proto/dxos/config';

describe('Protos', () => {
  it('test protos', () => {
    const config: ConfigType = {
      version: 1
    };

    console.log(JSON.stringify(config));
  });
});
