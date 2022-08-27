//
// Copyright 2022 DXOS.org
//

import { PublicKey } from '@dxos/protocols';

import { Pipeline } from './pipeline';

export class Space {
  readonly key = PublicKey.random();
  readonly pipeline = new Pipeline({ writable: true });

  // TODO(burdon): Space creating the genesis must auto admit first device and feed.
  // TODO(burdon): Start method should start the pipeline's iterator; multiple pipelines?
}
