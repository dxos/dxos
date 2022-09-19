//
// Copyright 2021 DXOS.org
//

import { Config as ConfigProto } from '@dxos/protocols/proto/dxos/config';

describe('Protos', () => {
  it('test protos', () => {
    const config: ConfigProto = {
      version: 1
    };

    console.log(JSON.stringify(config));
  });
});
