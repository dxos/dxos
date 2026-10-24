//
// Copyright 2026 DXOS.org
//

import { log } from '@dxos/log';

import { type Actor, type ActorSpec } from './actor.ts';
import { type VirtualClock } from './clock.ts';

/**
 * One step of an actor flow: the autocue flow step (`name`, `run`) plus the actor who performs it.
 * Steps of one actor run in order; different actors' steps run at the same time.
 */
export type ActorStep = {
  actor: number;
  name: string;
  run: (context: { actor: Actor }) => Promise<void>;
};

export type ActorFlow = {
  actors: ActorSpec[];
  /** The object every actor edits, created by the first actor before the others join. */
  document: { name: string; content: string };
  steps: ActorStep[];
  /** Scene length in ms, including a hold after the last step. */
  duration: number;
};

/**
 * Runs every actor's steps as a concurrent track on `clock`. Resolves when all tracks finish; a failing
 * step stops only its own actor's track.
 */
export const runFlow = async (
  flow: ActorFlow,
  actors: Actor[],
  clock: VirtualClock,
  onError?: (failure: { actor: string; step: string; error: unknown }) => void,
): Promise<void> => {
  await Promise.all(
    actors.map((actor) =>
      clock.track(async () => {
        for (const step of flow.steps.filter((step) => step.actor === actor.index)) {
          try {
            await step.run({ actor });
          } catch (error) {
            log.catch(error, { actor: actor.spec.name, step: step.name });
            onError?.({ actor: actor.spec.name, step: step.name, error });
            return;
          }
        }
      }),
    ),
  );
};
