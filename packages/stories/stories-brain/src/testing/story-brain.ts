//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';

import * as Capability from '@dxos/app-framework/Capability';
import * as Plugin from '@dxos/app-framework/Plugin';
import { DXN } from '@dxos/keys';
import { FactStore, type FactStoreApi } from '@dxos/pipeline-rdf';
import * as BrainFacts from '@dxos/plugin-agent/BrainFacts';
import * as BrainMemory from '@dxos/plugin-agent/BrainMemory';

/** The agent the brain stories hold their facts for: a story has one, and no agent sessions to wake. */
export const STORY_AGENT = 'story-agent';

/**
 * The story agent's brain, as the stories' modules use it: a pipeline-rdf `FactStore` that writes through the brain
 * (`BrainService.push`, store-only) and reads through `BrainService.query`.
 */
export type StoryBrainApi = {
  readonly store: FactStoreApi;
  /** {@link store} as a layer, for pipelines that read `FactStore` from context. */
  readonly layer: Layer.Layer<FactStore>;
  /** Fires after a write or clear through {@link store}; the brain itself has no change feed. */
  readonly subscribe: (listener: () => void) => () => void;
};

export const StoryBrain = Capability.makeSingleton<StoryBrainApi>()('org.dxos.stories.brain.storyBrain');

const makeStoryBrain = (): StoryBrainApi => {
  const listeners = new Set<() => void>();
  const notify = Effect.sync(() => listeners.forEach((listener) => listener()));
  const facts = BrainFacts.factStore(BrainMemory.make(undefined).service, STORY_AGENT);
  const store: FactStoreApi = {
    ...facts,
    putFacts: (entries) => facts.putFacts(entries).pipe(Effect.tap(() => notify)),
    clear: () => facts.clear().pipe(Effect.tap(() => notify)),
  };
  return {
    store,
    layer: Layer.succeed(FactStore, store),
    subscribe: (listener) => {
      listeners.add(listener);
      return () => void listeners.delete(listener);
    },
  };
};

/** Contributes the {@link StoryBrain} capability for the brain stories. */
export const StoryBrainPlugin = Plugin.define(
  Plugin.makeMeta({ key: DXN.make('org.dxos.plugin.stories.brain.storyBrain'), name: 'Story Brain' }),
).pipe(
  Plugin.addModule({
    id: 'story-brain',
    provides: [StoryBrain],
    activate: Capability.makeModule(() => Effect.succeed(Capability.contribute(StoryBrain, makeStoryBrain()))),
  }),
  Plugin.make,
);
