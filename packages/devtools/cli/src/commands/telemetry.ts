//
// Copyright 2026 DXOS.org
//

import * as Console from 'effect/Console';
import * as Effect from 'effect/Effect';
import * as Command from 'effect/unstable/cli/Command';

import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Capability from '@dxos/app-framework/Capability';
import { CommandConfig } from '@dxos/cli-util';
import { Observability } from '@dxos/observability';
import * as ObservabilityOperation from '@dxos/plugin-observability/ObservabilityOperation';

import { observabilityNamespace } from '../observability';

/**
 * The same wording Composer's settings pane carries, so what is collected does not depend on which
 * surface the user asked from.
 */
const DESCRIPTION =
  'When enabled, basic usage data is used to improve the product. This may include performance ' +
  'metrics, error logs, and usage data. No personally identifiable information, other than your ' +
  'public key, is included with this data and no private data ever leaves your devices.';

const readEnabled = Effect.fn(function* () {
  const { profile } = yield* CommandConfig;
  return !(yield* Effect.promise(() => Observability.isObservabilityDisabled(observabilityNamespace(profile))));
});

const report = Effect.fn(function* (enabled: boolean) {
  if (yield* CommandConfig.isJson) {
    yield* Console.log(JSON.stringify({ enabled }, null, 2));
    return;
  }
  yield* Console.log(`Telemetry is ${enabled ? 'enabled' : 'disabled'}.`);
  // The environment wins over the stored setting, so saying so saves a confused `dx telemetry enable`.
  if (!enabled && process.env.DX_DISABLE_OBSERVABILITY) {
    yield* Console.log('Set by DX_DISABLE_OBSERVABILITY in the environment.');
  }
});

const setEnabled = (state: boolean) =>
  Effect.fn(function* () {
    const { invokePromise } = yield* Capability.get(Capabilities.OperationInvoker);
    yield* Effect.promise(() => invokePromise(ObservabilityOperation.SetEnabled, { state }));
    yield* report(state);
  });

const status = Command.make(
  'status',
  {},
  Effect.fn(function* () {
    yield* report(yield* readEnabled());
  }),
).pipe(Command.withDescription('Show whether telemetry is enabled.'));

const enable = Command.make('enable', {}, setEnabled(true)).pipe(
  Command.withDescription('Send anonymous usage and performance data.'),
);

const disable = Command.make('disable', {}, setEnabled(false)).pipe(
  Command.withDescription('Stop sending usage and performance data.'),
);

export const telemetry = Command.make(
  'telemetry',
  {},
  Effect.fn(function* () {
    yield* report(yield* readEnabled());
    yield* Console.log('');
    yield* Console.log(DESCRIPTION);
  }),
).pipe(
  Command.withDescription('Show or change whether this profile sends usage and performance data.'),
  Command.withSubcommands([status, enable, disable]),
);
