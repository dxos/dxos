//
// Copyright 2025 DXOS.org
//

import { KeyValueStore } from '@effect/platform';
import * as Context from 'effect/Context';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import * as Option from 'effect/Option';
import * as Schema from 'effect/Schema';

import { ObjectId } from '@dxos/keys';

import { TriggerStateNotFoundError } from '../errors';

export const TriggerState = Schema.Struct({
  version: Schema.Literal('1'),
  triggerId: Schema.String,
  state: Schema.optional(
    Schema.Union(
      Schema.TaggedStruct('subscription', {
        processedVersions: Schema.Record({ key: ObjectId, value: Schema.String }),
      }),
    ),
  ),
});
export interface TriggerState extends Schema.Schema.Type<typeof TriggerState> {}

export class TriggerStateStore extends Context.Tag('@dxos/functions/TriggerStateStore')<
  TriggerStateStore,
  {
    getState(triggerId: ObjectId): Effect.Effect<TriggerState, TriggerStateNotFoundError>;
    saveState(state: TriggerState): Effect.Effect<void>;
  }
>() {
  static getState = Effect.serviceFunctionEffect(TriggerStateStore, (_) => _.getState);
  static saveState = Effect.serviceFunctionEffect(TriggerStateStore, (_) => _.saveState);

  static layerKv = Layer.effect(
    TriggerStateStore,
    Effect.gen(function* () {
      const kv = yield* KeyValueStore.KeyValueStore;
      const schemaStore = kv.forSchema(Schema.parseJson(TriggerState));
      const store: Context.Tag.Service<TriggerStateStore> = {
        getState: Effect.fn('TriggerStateStore.getState')(function* (triggerId: ObjectId) {
          const valueOption = yield* schemaStore.get(triggerId).pipe(Effect.orDie);
          if (Option.isNone(valueOption)) {
            return yield* Effect.fail(new TriggerStateNotFoundError());
          }
          return valueOption.value;
        }),
        saveState: Effect.fn('TriggerStateStore.saveState')(function* (state: TriggerState) {
          yield* schemaStore.set(state.triggerId, state).pipe(Effect.orDie);
        }),
      };
      return store;
    }),
  );

  static layerMemory = TriggerStateStore.layerKv.pipe(Layer.provide(KeyValueStore.layerMemory));
}
