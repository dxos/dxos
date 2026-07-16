//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import * as Effect from 'effect/Effect';
import React from 'react';
import { expect, waitFor, within } from 'storybook/test';

import { Capability } from '@dxos/app-framework';
import { withPluginManager } from '@dxos/app-framework/testing';
import { AppActivationEvents } from '@dxos/app-toolkit';
import { EffectEx } from '@dxos/effect';
import { type RDF } from '@dxos/pipeline-rdf';
import { ClientPlugin, initializeIdentity } from '@dxos/plugin-client/testing';
import { StorybookPlugin, corePlugins } from '@dxos/plugin-testing';
import { withLayout, withTheme } from '@dxos/react-ui/testing';
import { translations as reactUiTranslations } from '@dxos/react-ui/translations';

import { makeFactStoreRegistry } from '../../capabilities';
import { BrainCapabilities } from '../../types';
import { FactsCompanion } from './FactsCompanion';

// A shared registry contributed as the `FactStoreRegistry` capability and seeded (below) for the story's
// space, so `FactsCompanion` (space-scoped via `useActiveSpace`) renders real facts.
const registry = makeFactStoreRegistry();

/** Minimal RDF fact fixture (subject —predicate→ object) for the viewer. */
const fact = (id: string, subject: string, predicate: string, object: string): RDF.Fact => ({
  id,
  assertion: {
    subject: { entity: subject.toLowerCase(), label: subject },
    predicate,
    object: { entity: object.toLowerCase(), label: object },
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
      setupEvents: [AppActivationEvents.SetupSettings],
      // Contribute the seeded registry directly so the companion resolves it without the full FactStore module.
      capabilities: [Capability.contributes(BrainCapabilities.FactStoreRegistry, registry)],
      plugins: [
        ...corePlugins(),
        ClientPlugin({
          onClientInitialized: ({ client }) =>
            Effect.gen(function* () {
              const { personalSpace } = yield* initializeIdentity(client);
              yield* Effect.promise(() => EffectEx.runPromise(registry.forSpace(personalSpace.id).putFacts(FACTS)));
            }),
        }),
        StorybookPlugin({}),
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

/** Asserts the seeded facts surface in the companion. */
export const Test: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await waitFor(() => expect(canvas.getAllByText(/Alice/).length).toBeGreaterThan(0));
    void expect(canvas.getByText(/Acme/)).toBeInTheDocument();
  },
};
