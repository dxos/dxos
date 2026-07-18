//
// Copyright 2025 DXOS.org
//

// Operation handler capability module.
// `Capability.makeModule` creates a module that runs during plugin activation.
// `Capability.contributes` registers the operation handler set with the framework's
// operation dispatcher, which routes `Operation.invoke()` calls to the correct handler.

import * as Effect from 'effect/Effect';

import { Capabilities, Capability } from '@dxos/app-framework';
// Explicit import so the emitted `.d.ts` references the package via its public
// alias instead of a relative `node_modules` path (TS2883).
// eslint-disable-next-line unused-imports/no-unused-imports
import { type OperationHandlerSet } from '@dxos/compute';

import { SampleOperationHandlerSet } from '#operations';

// When the module doesn't need to access other capabilities or perform setup,
// use `Effect.succeed` directly instead of `Effect.fnUntraced(function* () { ... })`.
export default Capability.makeModule(() =>
  Effect.succeed([Capability.provide(Capabilities.OperationHandler, SampleOperationHandlerSet)]),
);
