//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { TrajectoryStore } from '@dxos/assistant';
import type * as Agent from '@dxos/compute/Agent';
import type * as Operation from '@dxos/compute/Operation';
import type * as Trajectory from '@dxos/compute/Trajectory';
import { Database, Obj } from '@dxos/echo';
import * as EffectEx from '@dxos/effect/EffectEx';
import * as AssistantOperation from '@dxos/plugin-assistant/AssistantOperation';

/** How often the feed is read while a run settles. */
const SETTLE_INTERVAL = 500;

/** A run settles once this many reads in a row find no new event. */
const SETTLE_READS = 3;

/** Every trajectory event in the chat's feed, on every branch, in local order. */
export const readEvents = async (chat: Agent.Session): Promise<readonly Trajectory.Event[]> => {
  const db = Obj.getDatabase(chat);
  if (!db) {
    throw new Error('The chat is not in a database.');
  }
  const feed = await chat.feed.load();
  return EffectEx.runPromise(TrajectoryStore.read(feed).pipe(Effect.provide(Database.layer(db))));
};

/**
 * Plays `prompts` in `chat` one after another, each to the end of its turn, then waits for the feed to stop growing and
 * returns every event in it. With a scripted model whose delays are removed (`ScriptedScene.withoutDelays`) a whole
 * scenario finishes in seconds, so a story can step through the finished feed rather than wait for it.
 */
export const runToEnd = async ({
  invoker,
  chat,
  prompts,
}: {
  invoker: Pick<Operation.OperationService, 'invokePromise'>;
  chat: Agent.Session;
  prompts: readonly string[];
}): Promise<readonly Trajectory.Event[]> => {
  // The operation runs with space affinity, so it needs the chat's space.
  const spaceId = Obj.getDatabase(chat)?.spaceId;
  for (const prompt of prompts) {
    const { error } = await invoker.invokePromise(
      AssistantOperation.RunPromptInChat,
      { chat, prompt, wait: true },
      { spaceId },
    );
    if (error) {
      throw error;
    }
  }

  // A turn settles before the work it started in the background (a subagent, a chat name) has written its last event.
  let events = await readEvents(chat);
  for (let quiet = 0; quiet < SETTLE_READS;) {
    await new Promise((resolve) => setTimeout(resolve, SETTLE_INTERVAL));
    const next = await readEvents(chat);
    quiet = next.length === events.length ? quiet + 1 : 0;
    events = next;
  }
  return events;
};
