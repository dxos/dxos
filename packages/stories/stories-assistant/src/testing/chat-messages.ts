//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { TrajectoryStore } from '@dxos/assistant';
import { Database, type Feed } from '@dxos/echo';
import * as EffectEx from '@dxos/effect/EffectEx';
import { type Message } from '@dxos/types';

/** Every message in a chat's feed, legacy records included, in the order they were written. */
export const chatMessages = (db: Database.Database, feed: Feed.Feed): Promise<Message.Message[]> =>
  EffectEx.runPromise(TrajectoryStore.messages(feed).pipe(Effect.provide(Database.layer(db))));
