//
// Copyright 2025 DXOS.org
//

import { S } from '@dxos/echo-schema';

import { Capabilities, Events } from '../../common';
import { contributes, defineEvent, defineCapability, defineModule, definePlugin } from '../../core';
import { createResolver, type IntentSchema } from '../../plugin-intent';

export const Number = defineCapability<number>('dxos.org/test/generator/number');

export const CountEvent = defineEvent('dxos.org/test/generator/count');

export const createPluginId = (id: string) => `dxos.org/test/generator/${id}`;

export const createGeneratorIntent = (id: string) => {
  class Alert extends S.TaggedClass<Alert>()(`${createPluginId(id)}/action/alert`, {
    input: S.Void,
    output: S.Void,
  }) {}

  return Alert as unknown as IntentSchema<any, any>;
};

export const createNumberPlugin = (id: string) => {
  const number = Math.floor(Math.random() * 100);

  return definePlugin({ id }, [
    defineModule({
      id: `${id}/main`,
      activatesOn: CountEvent,
      activate: () => contributes(Number, number),
    }),
    defineModule({
      id: `${id}/intent-resolver`,
      activatesOn: Events.SetupIntents,
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
