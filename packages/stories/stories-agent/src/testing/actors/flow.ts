//
// Copyright 2026 DXOS.org
//

import type * as Plugin from '@dxos/app-framework/Plugin';
import { type Client } from '@dxos/client';
import { type Space } from '@dxos/client/echo';
import { type Type } from '@dxos/echo';
import { log } from '@dxos/log';
import * as Markdown from '@dxos/plugin-markdown/Markdown';

import { type Actor, type ActorSpec, type QuietWindows } from './actor.ts';
import { type VirtualClock } from './clock.ts';

/**
 * One step of an actor flow: the autocue flow step (`name`, `run`) plus the actor who performs it.
 * Steps of one actor run in order; different actors' steps run at the same time.
 */
export type ActorStep<T = unknown> = {
  actor: number;
  name: string;
  /** `target` is what the flow's `seed` returned: what the scene builds towards, read by the steps. */
  run: (context: { actor: Actor; target: T }) => Promise<void>;
};

export type ActorFlow<T = unknown> = {
  actors: ActorSpec[];
  /** The document the writers edit, by name. */
  document: { name: string };
  /** Seeds the shared space (the first actor's client, before the others join) and returns the target. */
  seed: (context: { client: Client; space: Space }) => Promise<T>;
  /** Schemas every actor's client registers, beside the harness's own. */
  types?: Type.AnyEntity[];
  /** Plugins an actor's app adds to the harness's own, by actor. */
  plugins?: (spec: ActorSpec, index: number) => Plugin.Plugin[];
  steps: ActorStep<T>[];
  /** Windows in which every actor stops editing, to give replication a chance to catch up. */
  quiet?: QuietWindows;
  /** Scene length in ms, including a hold after the last step. */
  duration: number;
};

/**
 * Runs every actor's steps as a concurrent track on `clock`. Resolves when all tracks finish; a failing
 * step stops only its own actor's track.
 */
export const runFlow = async <T>(
  flow: ActorFlow<T>,
  target: T,
  actors: Actor[],
  clock: VirtualClock,
  onError?: (failure: { actor: string; step: string; error: unknown }) => void,
): Promise<void> => {
  await Promise.all(
    actors.map((actor) =>
      clock.track(async () => {
        for (const step of flow.steps.filter((step) => step.actor === actor.index)) {
          try {
            await step.run({ actor, target });
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

/** A seed that creates one markdown document, for flows whose actors only write. */
export const seedDocument =
  (document: { name: string; content: string }) =>
  async ({ space }: { space: Space }): Promise<void> => {
    space.db.add(Markdown.make(document));
  };
