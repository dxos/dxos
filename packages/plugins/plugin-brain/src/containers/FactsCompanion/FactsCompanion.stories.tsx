//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import * as Effect from 'effect/Effect';
import React from 'react';

import * as ActivationEvents from '@dxos/app-framework/ActivationEvents';
import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Capability from '@dxos/app-framework/Capability';
import * as Plugin from '@dxos/app-framework/Plugin';
import { withPluginManager } from '@dxos/app-framework/testing';
import * as Agent from '@dxos/assistant/Agent';
import * as Instructions from '@dxos/compute/Instructions';
import { DXN, Obj, Ref } from '@dxos/echo';
import { type RDF } from '@dxos/pipeline-rdf';
import * as AgentPresence from '@dxos/plugin-agent/AgentPresence';
import * as BrainMemory from '@dxos/plugin-agent/BrainMemory';
import { ClientPlugin, initializeIdentity } from '@dxos/plugin-client/testing';
import * as CorePlugins from '@dxos/plugin-testing/CorePlugins';
import * as StorybookPlugin from '@dxos/plugin-testing/StorybookPlugin';
import { withLayout, withTheme } from '@dxos/react-ui/testing';
import { translations as reactUiTranslations } from '@dxos/react-ui/translations';

import { BrainOperationHandlerSet } from '#operations';

import { FactsCompanion } from './FactsCompanion.tsx';

// The brain the story's agent holds its facts in, seeded (below) once the agent exists.
const state = BrainMemory.makeState();

/** Minimal RDF fact fixture (subject —predicate→ object) for the viewer. */
const fact = (id: string, subject: string, predicate: string, object: string): RDF.Fact => ({
  id,
  assertion: {
    subject: { kind: 'entity', entity: subject.toLowerCase(), label: subject },
    predicate,
    object: { kind: 'entity', entity: object.toLowerCase(), label: object },
  },
  factuality: { value: 'CT+', polarity: '+' },
  attribution: { source: 'story:doc', generatedAtTime: '2026-01-01T00:00:00.000Z' },
  recordedAt: '2026-01-01T00:00:00.000Z',
  extractor: { id: 'story', model: 'story', version: '1' },
  sourceHash: id,
});

const FACTS: RDF.Fact[] = [fact('f1', 'Alice', 'worksAt', 'Acme'), fact('f2', 'Alice', 'knows', 'Bob')];

// The brain and the `ListFacts` handler the companion polls, without the rest of plugin-agent.
const StoryBrainPlugin = Plugin.define(
  Plugin.makeMeta({ key: DXN.make('org.dxos.plugin.brain.story.brain'), name: 'Story Brain' }),
).pipe(
  Plugin.addModule<void>(
    Capability.inlineModule('operation-handler', { provides: [Capabilities.OperationHandler] }, () =>
      Effect.succeed([Capability.contribute(Capabilities.OperationHandler, BrainOperationHandlerSet.handlers)]),
    ),
  ),
  Plugin.addModule({
    id: 'brain',
    // The process manager snapshots LayerSpecs once at boot.
    activatesOn: ActivationEvents.Startup,
    provides: [Capabilities.LayerSpec],
    activate: () => Effect.succeed([Capability.contribute(Capabilities.LayerSpec, BrainMemory.factsLayerSpec(state))]),
  }),
  Plugin.make,
);

const meta = {
  title: 'plugins/plugin-brain/containers/FactsCompanion',
  render: () => <FactsCompanion />,
  decorators: [
    withLayout({ layout: 'fullscreen' }),
    withTheme(),
    withPluginManager({
      plugins: [
        ...CorePlugins.make(),
        ClientPlugin.make({
          types: [Agent.Agent, Instructions.Instructions],
          onClientInitialized: ({ client }) =>
            Effect.gen(function* () {
              const { defaultSpace } = yield* initializeIdentity(client);
              const agent = defaultSpace.db.add(
                Obj.make(Agent.Agent, { name: 'Kai', instructions: Ref.make(Instructions.make({ text: '' })) }),
              );
              yield* BrainMemory.make(undefined, { state })
                .service.push(AgentPresence.brainId(agent), FACTS)
                .pipe(Effect.orDie);
            }),
        }),
        StoryBrainPlugin(),
        StorybookPlugin.make({}),
      ],
    }),
  ],
  parameters: {
    layout: 'fullscreen',
    controls: { disable: true },
    translations: [...reactUiTranslations],
  },
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

/** Renders the facts in the space agent's brain via the `FactViewer`. */
export const Default: Story = {};

// NOTE: no interactive `play` test — the seeded-space facts don't resolve in the headless storybook test
// runner; the story renders live in the running storybook (dev server).
