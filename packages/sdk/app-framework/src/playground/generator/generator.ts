//
// Copyright 2025 DXOS.org
//

import * as Schema from 'effect/Schema';

import { Capabilities, Events } from '../../common';
import { contributes, defineCapability, defineEvent, defineModule, definePlugin } from '../../core';
import { type IntentSchema, createResolver } from '../../plugin-intent';

export const Number = defineCapability<number>('dxos.org/test/generator/number');

export const CountEvent = defineEvent('dxos.org/test/generator/count');

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

  return definePlugin({ id, name: `Plugin ${id}` }, () => [
    defineModule({
      id: `${id}/main`,
      activatesOn: CountEvent,
      activate: () => contributes(Number, number),
    }),
    defineModule({
      id: `${id}/intent-resolver`,
      activatesOn: Events.SetupIntentResolver,
      activate: () =>
        contributes(
          Capabilities.IntentResolver,
          createResolver({
            intent: createGeneratorIntent(id),
            resolve: () => window.alert(JSON.stringify({ number })),
          }),
        ),
    }),
  ]);
};
