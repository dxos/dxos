//
// Copyright 2025 DXOS.org
//

import { S } from '@dxos/echo-schema';
import { AccessTokenType } from '@dxos/schema';

import { TOKEN_MANAGER_PLUGIN } from './meta';

export namespace TokenManagerAction {
  const TOKEN_MANAGER_ACTION = `${TOKEN_MANAGER_PLUGIN}/action`;

  export class AccessTokenCreated extends S.TaggedClass<AccessTokenCreated>()(
    `${TOKEN_MANAGER_ACTION}/access-token-created`,
    {
      input: S.Struct({ accessToken: AccessTokenType }),
      output: S.Void,
    },
  ) {}
}
