//
// Copyright 2025 DXOS.org
//

import { S } from '@dxos/echo-schema';

import { IntegrationType } from './integration';
import { INTEGRATION_PLUGIN } from '../meta';

export namespace IntegrationAction {
  const INTEGRATION_ACTION = `${INTEGRATION_PLUGIN}/action`;

  export class IntegrationCreated extends S.TaggedClass<IntegrationCreated>()(
    `${INTEGRATION_ACTION}/integration-created`,
    {
      input: S.Struct({ object: IntegrationType }),
      output: S.Void,
    },
  ) {}
}
