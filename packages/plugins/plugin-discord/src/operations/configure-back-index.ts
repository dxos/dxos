//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Operation from '@dxos/compute/Operation';
import * as Trigger from '@dxos/compute/Trigger';
import { CrawlState } from '@dxos/crawler';
import { Database, Feed, Obj, Ref, type Type } from '@dxos/echo';
import * as FactFeed from '@dxos/plugin-agent/FactFeed';

import { DiscordOperation } from '#types';

/** Loads the object a trigger input field references, when it is a `type` object. */
const loadInput = <S extends Type.AnyObj>(type: S, value: unknown) =>
  Effect.gen(function* () {
    if (!Ref.isRef(value)) {
      return undefined;
    }
    const target = yield* Database.load(value).pipe(
      Effect.catchTag('EntityNotFoundError', () => Effect.succeed(undefined)),
    );
    return Obj.instanceOf(type, target) ? target : undefined;
  });

const handler: Operation.WithHandler<typeof DiscordOperation.ConfigureBackIndex> =
  DiscordOperation.ConfigureBackIndex.pipe(
    Operation.withHandler(
      Effect.fn(function* ({ trigger: triggerRef, name, cron, enabled, ...config }) {
        // A trigger that is gone fails the load: reconfiguring it must not silently start a second back-index.
        const existing = triggerRef ? yield* Database.load(triggerRef) : undefined;
        const state =
          (yield* loadInput(CrawlState.CrawlState, existing?.input?.state)) ??
          (yield* Database.add(CrawlState.make({ name: name ?? 'Discord back-index' })));
        const facts =
          (yield* loadInput(Feed.Feed, existing?.input?.facts)) ??
          (yield* Database.add(Feed.make({ name: name ?? 'Discord facts', kind: FactFeed.KIND })));
        const input = {
          ...config,
          channels: [...new Set(config.channels)],
          state: Ref.make(state),
          facts: Ref.make(facts),
        };
        const spec = Trigger.specTimer(cron ?? DiscordOperation.DEFAULT_BACK_INDEX_CRON);
        const trigger =
          existing ??
          (yield* Database.add(
            Trigger.make({
              runnable: Ref.make(Operation.serialize(DiscordOperation.CrawlDiscordChannels)),
              remote: true,
              enabled: enabled ?? true,
              spec,
              input,
            }),
          ));
        if (existing) {
          Obj.update(existing, (existing) => {
            existing.input = input;
            existing.spec = spec;
            existing.enabled = enabled ?? existing.enabled ?? true;
          });
        }
        // The frontier shows the configured channels at once, before the first run.
        CrawlState.reconcileChannels(state, input.channels);
        return { trigger: Ref.make(trigger), state: Ref.make(state), facts: Ref.make(facts) };
      }),
    ),
  );

export default handler;
