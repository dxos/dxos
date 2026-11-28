//
// Copyright 2026 DXOS.org
//

// This file needs invalid usage, so the diagnostic reporting it is the assertion.
/** @effect-diagnostics unnecessaryEffectGen:skip-file */

import type * as Context from 'effect/Context';
import * as Effect from 'effect/Effect';
import type * as Layer from 'effect/Layer';
import * as Schema from 'effect/Schema';
import { describe, expect, it } from 'tstyche';

import * as Operation from '@dxos/compute/Operation';
import { DXN } from '@dxos/keys';

import { Settings, Summarizer } from '../contracts/index.ts';
import type * as Service from './Service.ts';
import type * as ServiceHost from './ServiceHost.ts';

type SettingsRequirement = Service.Requirement<'org.dxos.stories.services.settings'>;
type SummarizerRequirement = Service.Requirement<'org.dxos.stories.services.summarizer'>;

declare const host: ServiceHost.ServiceHost;

const readsSettings = Effect.gen(function* () {
  const settings = yield* Settings.Contract;
  return yield* settings.values.get;
});

const declaresSettings = Operation.make({
  input: Schema.Void,
  output: Schema.Void,
  meta: { key: DXN.make('com.example.operation.declaresSettings') },
  services: [Settings.Contract],
});

describe('a contract as an Effect service', () => {
  it('is the service key of its client', () => {
    expect(Settings.Contract).type.toBeAssignableTo<Context.Key<SettingsRequirement, Settings.Client>>();
    expect<Context.Service.Identifier<typeof Settings.Contract>>().type.toBe<SettingsRequirement>();
    expect<Context.Service.Shape<typeof Settings.Contract>>().type.toBe<Settings.Client>();
  });

  it('yields its client and adds its requirement to the Effect', () => {
    expect(readsSettings).type.toBe<Effect.Effect<Settings.Values, Service.Failure, SettingsRequirement>>();
  });

  it('has a requirement distinct from another contract', () => {
    expect<SettingsRequirement>().type.not.toBeAssignableTo<SummarizerRequirement>();
  });

  it('is provided by a host layer, which removes the requirement', () => {
    expect(host.layer(Settings.Contract)).type.toBe<Layer.Layer<SettingsRequirement>>();
    expect(readsSettings.pipe(Effect.provide(host.layer(Settings.Contract)))).type.toBe<
      Effect.Effect<Settings.Values, Service.Failure>
    >();
  });

  it('is not provided by the layer of another contract', () => {
    expect(readsSettings.pipe(Effect.provide(host.layer(Summarizer.Contract)))).type.toBe<
      Effect.Effect<Settings.Values, Service.Failure, SettingsRequirement>
    >();
  });
});

describe('a contract in an operation', () => {
  it('goes in services, and the operation then requires it', () => {
    expect<Operation.Definition.Services<typeof declaresSettings>>().type.toBe<SettingsRequirement>();
  });

  it('is yielded by the handler of an operation that declares it', () => {
    expect(
      Operation.withHandler(declaresSettings, (_input) =>
        Effect.gen(function* () {
          yield* Settings.Contract;
        }),
      ),
    ).type.not.toRaiseError();
  });

  it('is rejected in the handler of an operation that does not declare it', () => {
    expect(
      Operation.withHandler(declaresSettings, (_input) =>
        Effect.gen(function* () {
          yield* Summarizer.Contract;
        }),
      ),
    ).type.toRaiseError(
      'This Effect requires a service that is missing from the expected Effect context: `Requirement<"org.dxos.stories.services.summarizer">`.',
      `Type 'Requirement<"org.dxos.stories.services.summarizer">' is not assignable to type 'Requirement<"org.dxos.stories.services.settings"> | Service'`,
    );
  });
});
