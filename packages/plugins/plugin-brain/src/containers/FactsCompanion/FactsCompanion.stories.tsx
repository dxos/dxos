//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import React from 'react';

import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Capability from '@dxos/app-framework/Capability';
import { withPluginManager } from '@dxos/app-framework/testing';
import * as Agent from '@dxos/assistant/Agent';
import * as Instructions from '@dxos/compute/Instructions';
import * as LayerSpec from '@dxos/compute/LayerSpec';
import { Obj, Ref } from '@dxos/echo';
import * as EffectEx from '@dxos/effect/EffectEx';
import { type RDF } from '@dxos/pipeline-rdf';
import * as BrainMemory from '@dxos/plugin-agent/BrainMemory';
import * as BrainService from '@dxos/plugin-agent/BrainService';
import { ClientPlugin, initializeIdentity } from '@dxos/plugin-client/testing';
import * as CorePlugins from '@dxos/plugin-testing/CorePlugins';
import * as StorybookPlugin from '@dxos/plugin-testing/StorybookPlugin';
import { withLayout, withTheme } from '@dxos/react-ui/testing';
import { translations as reactUiTranslations } from '@dxos/react-ui/translations';

import { BrainOperationHandlerSet } from '#operations';

import { FactsCompanion } from './FactsCompanion.tsx';

// An in-memory brain contributed as the `BrainService` layer and seeded (below) for an agent in the story's space,
// so `FactsCompanion` (space-scoped via `useActiveSpace`) renders real facts.
const brain = BrainMemory.makeDetached();
const brainSpec = LayerSpec.make({ affinity: 'application', requires: [], provides: [BrainService.BrainService] }, () =>
  Layer.succeed(BrainService.BrainService, brain.service),
);

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

const meta = {
  title: 'plugins/plugin-brain/containers/FactsCompanion',
  render: () => <FactsCompanion />,
  decorators: [
    withLayout({ layout: 'fullscreen' }),
    withTheme(),
    withPluginManager({
      // The brain and the `ListFacts` handler the companion polls, without the rest of BrainPlugin.
      capabilities: [
        Capability.contribute(Capabilities.LayerSpec, brainSpec),
        Capability.contribute(Capabilities.OperationHandler, BrainOperationHandlerSet.handlers),
      ],
      plugins: [
        ...CorePlugins.make(),
        ClientPlugin.make({
          onClientInitialized: ({ client }) =>
            Effect.gen(function* () {
              const { defaultSpace } = yield* initializeIdentity(client);
              const agent = defaultSpace.db.add(
                Obj.make(Agent.Agent, {
                  name: 'Story agent',
                  instructions: Ref.make(Instructions.make({ name: 'Story agent', text: '' })),
                }),
              );
              yield* Effect.promise(() => EffectEx.runPromise(brain.service.push(agent.id, FACTS)));
            }),
        }),
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

/** Renders the space's extracted facts via the `FactViewer`. */
export const Default: Story = {};

// NOTE: no interactive `play` test — the seeded-space facts don't resolve in the headless storybook test
// runner; the story renders live in the running storybook (dev server).
