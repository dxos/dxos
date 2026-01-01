//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capability, Common, OperationResolver } from '@dxos/app-framework';

import { Template, TemplateOperation } from '../../types';

export default Capability.makeModule(() =>
  Effect.succeed(
    Capability.contributes(Common.Capability.OperationHandler, [
      OperationResolver.make({
        operation: TemplateOperation.Create,
        handler: ({ name }) =>
          Effect.succeed({
            object: Template.make({ name }),
          }),
      }),
    ]),
  ),
);
