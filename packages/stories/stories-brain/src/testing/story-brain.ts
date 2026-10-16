//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Capability from '@dxos/app-framework/Capability';
import * as Plugin from '@dxos/app-framework/Plugin';
import { DXN } from '@dxos/keys';
import { type FactStoreApi } from '@dxos/pipeline-rdf';
import * as BrainFactStore from '@dxos/plugin-agent/BrainFactStore';
import * as BrainMemory from '@dxos/plugin-agent/BrainMemory';
import type * as BrainService from '@dxos/plugin-agent/BrainService';

/** The agent whose brain the brain stories fill and read; the stories run no agent, so it is only a key. */
export const STORY_AGENT = 'story-agent';

export type StoryBrain = {
  readonly brain: BrainService.Service;
  readonly agent: string;
  /** The agent's brain as a `FactStore`, for the pipelines that write through one. */
  readonly facts: FactStoreApi;
};

/** Capability exposing the story agent's in-memory brain to the brain-story modules. */
export const StoryBrain = Capability.makeSingleton<StoryBrain>()('org.dxos.stories.brain.storyBrain');

const StoryBrainModule = Capability.makeModule(() =>
  Effect.sync(() => {
    const { service: brain } = BrainMemory.makeDetached();
    return Capability.contribute(StoryBrain, {
      brain,
      agent: STORY_AGENT,
      facts: BrainFactStore.make(brain, STORY_AGENT),
    });
  }),
);

/** Contributes the {@link StoryBrain}: the one agent brain the brain stories write facts into and read them from. */
export const StoryBrainPlugin = Plugin.define(
  Plugin.makeMeta({ key: DXN.make('org.dxos.plugin.stories.brain.storyBrain'), name: 'Story Brain' }),
).pipe(
  Plugin.addModule({
    id: 'story-brain',
    provides: [StoryBrain],
    activate: StoryBrainModule,
  }),
  Plugin.make,
);
