//
// Copyright 2022 DXOS.org
//

import { PublicKey } from '@dxos/protocols';

import { Pipeline } from './pipeline';

export class Space {
  readonly key = PublicKey.random();
  readonly pipeline = new Pipeline({ writable: true });
}
