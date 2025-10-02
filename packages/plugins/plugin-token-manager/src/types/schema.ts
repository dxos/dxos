//
// Copyright 2025 DXOS.org
//

import { Schema } from 'effect';

import { DataType } from '@dxos/schema';

import { meta } from '../meta';

export namespace TokenManagerAction {
  export class AccessTokenCreated extends Schema.TaggedClass<AccessTokenCreated>()(
    `${meta.id}/action/access-token-created`,
    {
      input: Schema.Struct({ accessToken: DataType.AccessToken }),
      output: Schema.Void,
    },
  ) {}
}
