//
// Copyright 2025 DXOS.org
//

import { Schema } from 'effect';

import { DataType } from '@dxos/schema';

import { TOKEN_MANAGER_PLUGIN } from './meta';

export namespace TokenManagerAction {
  const TOKEN_MANAGER_ACTION = `${TOKEN_MANAGER_PLUGIN}/action`;

  export class AccessTokenCreated extends Schema.TaggedClass<AccessTokenCreated>()(
    `${TOKEN_MANAGER_ACTION}/access-token-created`,
    {
      input: Schema.Struct({ accessToken: DataType.AccessToken }),
      output: Schema.Void,
    },
  ) {}
}
