//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as SampleSpace from '@dxos/app-toolkit/SampleSpace';
import * as Instructions from '@dxos/compute/Instructions';
import * as Routine from '@dxos/compute/Routine';
import * as Trigger from '@dxos/compute/Trigger';
import { Database, Ref, Tag } from '@dxos/echo';
import { StateMap, TagIndex } from '@dxos/schema';

import { Magazine, Subscription } from '#types';

import { makeCurationRoutine } from '../../templates/magazine-curation.ts';
import { type FeedKey, FEEDS, MAGAZINE } from './feeds.ts';

export type Provides = {
  readonly feeds: Record<FeedKey, Subscription.Subscription>;
  readonly magazine: Magazine.Magazine;
  readonly routine: Routine.Routine;
};

/** Five real AI news feeds, an empty magazine over them, and its curation routine (off). Spec: `CONTENT.md`. */
export const Partial: SampleSpace.Partial<Provides> = SampleSpace.partial('ai-briefing', {
  schemas: [
    Subscription.Subscription,
    Subscription.Post,
    Subscription.PostContent,
    Magazine.Magazine,
    Instructions.Instructions,
    Routine.Routine,
    Trigger.Trigger,
    StateMap.StateMap,
    TagIndex.TagIndex,
    Tag.Tag,
  ],
  run: Effect.fnUntraced(function* () {
    const feeds = yield* SampleSpace.seed(FEEDS, ({ name, url }) =>
      Database.add(Subscription.makeSubscription({ name, url, type: 'rss' })),
    );

    const magazine = yield* Database.add(
      Magazine.make({
        name: MAGAZINE.name,
        instructions: MAGAZINE.topic,
        feeds: FEEDS.map(({ key }) => Ref.make(feeds[key])),
      }),
    );

    const routine = yield* Database.add(makeCurationRoutine(magazine, { name: MAGAZINE.routine, enabled: false }));

    return { feeds, magazine, routine };
  }),
});
