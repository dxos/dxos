//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Schema from 'effect/Schema';

import * as Common from '../../common';
import { ActivationEvent, Capability, Plugin } from '../../core';
import { type IntentSchema, createResolver } from '../../plugin-intent';

export const Number = Capability.make<number>('dxos.org/test/generator/number');

export const CountEvent = ActivationEvent.make('dxos.org/test/generator/count');

export const createPluginId = (id: string) => `dxos.org/test/generator/${id}`;

export const createGeneratorIntent = (id: string) => {
  class Alert extends Schema.TaggedClass<Alert>()(`${createPluginId(id)}/action/alert`, {
    input: Schema.Void,
    output: Schema.Void,
  }) {}

  return Alert as unknown as IntentSchema<any, any>;
};

export const createNumberPlugin = (id: string) => {
  const number = Math.floor(Math.random() * 100);

  return Plugin.define({ id, name: `Plugin ${id}` }).pipe(
    Plugin.addModule({
      id: 'Main',
      activatesOn: CountEvent,
      activate: () => Effect.succeed(Capability.contributes(Number, number)),
    }),
    Common.Plugin.addIntentResolverModule({
      activate: () =>
        Effect.succeed(
          Capability.contributes(
            Common.Capability.IntentResolver,
            createResolver({
              intent: createGeneratorIntent(id),
              resolve: () => window.alert(JSON.stringify({ number })),
            }),
          ),
        ),
    }),
    Plugin.make,
  )();
};
