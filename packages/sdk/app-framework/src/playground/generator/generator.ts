//
// Copyright 2025 DXOS.org
//

import * as Schema from 'effect/Schema';

import { Capabilities, Events } from '../../common';
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
      activate: () => Capability.contributes(Number, number),
    }),
    Plugin.addModule({
      id: 'IntentResolver',
      activatesOn: Events.SetupIntentResolver,
      activate: () =>
        Capability.contributes(
          Capabilities.IntentResolver,
          createResolver({
            intent: createGeneratorIntent(id),
            resolve: () => window.alert(JSON.stringify({ number })),
          }),
        ),
    }),
    Plugin.make,
  )();
};
