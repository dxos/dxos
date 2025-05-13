//
// Copyright 2025 DXOS.org
//

import { Schema } from 'effect';

import { IntegrationType } from './integration';
import { INTEGRATION_PLUGIN } from '../meta';

export namespace IntegrationAction {
  const INTEGRATION_ACTION = `${INTEGRATION_PLUGIN}/action`;

  export class IntegrationCreated extends Schema.TaggedClass<IntegrationCreated>()(
    `${INTEGRATION_ACTION}/integration-created`,
    {
      input: Schema.Struct({ object: IntegrationType }),
      output: Schema.Void,
    },
  ) {}
}
