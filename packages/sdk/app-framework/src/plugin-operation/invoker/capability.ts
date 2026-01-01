//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Common from '../../common';
import { Capability } from '../../core';

import * as OperationInvoker from './operation-invoker';

//
// Capability Module
//

export default Capability.makeModule((context) =>
  Effect.succeed(
    Capability.contributes(
      Common.Capability.OperationInvoker,
      OperationInvoker.make(() =>
        Effect.gen(function* () {
          yield* context.activate(Common.ActivationEvent.SetupOperationResolver);
          return context.getCapabilities(Common.Capability.OperationResolver).flat();
        }),
      ),
    ),
  ),
);
