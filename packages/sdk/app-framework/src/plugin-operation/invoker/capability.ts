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
  Effect.gen(function* () {
    const invoker = OperationInvoker.make(() => context.getCapabilities(Common.Capability.OperationHandler).flat());

    return Effect.succeed(Capability.contributes(Common.Capability.OperationInvoker, invoker));
  }).pipe(Effect.flatten),
);
