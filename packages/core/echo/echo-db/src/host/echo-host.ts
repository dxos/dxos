//
// Copyright 2024 DXOS.org
//

import { Resource } from '@dxos/context';
import { type LevelDB } from '@dxos/echo-pipeline';

export type EchoHostParams = {
  db: LevelDB;
};

export class EchoHost extends Resource {
  // private readonly _indexMetadataStore:

  constructor({ db }: EchoHostParams) {
    super();
  }
}
