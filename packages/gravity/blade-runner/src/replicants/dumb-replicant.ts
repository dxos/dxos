//
// Copyright 2024 DXOS.org
//

import { log } from '@dxos/log';

import { ReplicantRegistry } from '../env';

export class DumbReplicant {
  constructor() {
    log.trace('DumbReplicant created');
  }

  async doSomethingFunny() {
    log.trace('DumbReplicant trying to do back-flip');
    return 'DumbReplicant did a back-flip';
  }
}

ReplicantRegistry.instance.register(DumbReplicant);
