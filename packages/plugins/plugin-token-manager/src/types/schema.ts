//
// Copyright 2025 DXOS.org
//

import * as Schema from 'effect/Schema';

import * as Operation from '@dxos/operation';
import { AccessToken } from '@dxos/types';

import { meta } from '../meta';

const TOKEN_MANAGER_OPERATION = `${meta.id}/operation`;

export namespace TokenManagerOperation {
  export const AccessTokenCreated = Operation.make({
    meta: { key: `${TOKEN_MANAGER_OPERATION}/access-token-created`, name: 'Access Token Created' },
    schema: {
      input: Schema.Struct({ accessToken: AccessToken.AccessToken }),
      output: Schema.Void,
    },
  });
}
