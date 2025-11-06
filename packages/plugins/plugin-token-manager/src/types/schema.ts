//
// Copyright 2025 DXOS.org
//

import * as Schema from 'effect/Schema';

import { AccessToken } from '@dxos/types';

import { meta } from '../meta';

export namespace TokenManagerAction {
  export class AccessTokenCreated extends Schema.TaggedClass<AccessTokenCreated>()(
    `${meta.id}/action/access-token-created`,
    {
      input: Schema.Struct({ accessToken: AccessToken.AccessToken }),
      output: Schema.Void,
    },
  ) {}
}
