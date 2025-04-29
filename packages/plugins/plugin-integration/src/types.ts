//
// Copyright 2025 DXOS.org
//

import { S } from '@dxos/echo-schema';
import { AccessTokenType } from '@dxos/schema';

import { INTEGRATION_PLUGIN } from './meta';

export namespace IntegrationAction {
  const INTEGRATION_ACTION = `${INTEGRATION_PLUGIN}/action`;

  export class AccessTokenCreated extends S.TaggedClass<AccessTokenCreated>()(
    `${INTEGRATION_ACTION}/access-token-created`,
    {
      input: S.Struct({ accessToken: AccessTokenType }),
      output: S.Void,
    },
  ) {}
}
