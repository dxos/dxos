//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import * as Effect from 'effect/Effect';
import React, { useEffect, useState } from 'react';

import { withPluginManager } from '@dxos/app-framework/testing';
import { useCapability } from '@dxos/app-framework/ui';
import { EffectEx } from '@dxos/effect';
import { type RDF } from '@dxos/pipeline-rdf';
import { BrainPlugin } from '@dxos/plugin-brain/plugin';
import { BrainCapabilities } from '@dxos/plugin-brain/types';
import { ClientPlugin, initializeIdentity } from '@dxos/plugin-client/testing';
import { SpacePlugin } from '@dxos/plugin-space/testing';
import { StorybookPlugin, corePlugins } from '@dxos/plugin-testing';
import { useSpaces } from '@dxos/react-client/echo';
import { withLayout, withTheme } from '@dxos/react-ui/testing';
import { ModuleContainer, type ModuleLayout } from '@dxos/story-modules';

import { FactsStoryContext } from '../modules';
import { CrawlerStoresPlugin } from '../testing';
import { Module, StoryModulesPlugin } from '../testing/modules';

/**
 * The columns of the Facts story, driven through `ModuleContainer`. The crawl/query/questions modules
 * produce facts into Brain's per-space `FactStore` (the Composer provider); the facts/entities modules
 * consume the shared display state. Facts live in the `FactStoreRegistry`; crawler-only stores come
 * from the story-local {@link CrawlerStoresPlugin}.
 */
const CRAWL_LAYOUT: ModuleLayout = [[Module.Crawl, Module.Query, Module.Questions], [Module.Facts], [Module.Entities]];

/** In-memory variant: just the viewer + entity nav over a seeded store. */
const VIEWER_LAYOUT: ModuleLayout = [[Module.Facts], [Module.Entities]];

/**
 * Owns the cross-module display state (current facts view + selected entity) and drives the layout.
 * `seed` pre-populates the space's `FactStore` (the no-crawl variant).
 */
const FactsStoryRoot = ({ layout, seed }: { layout: ModuleLayout; seed?: RDF.Fact[] }) => {
  const registry = useCapability(BrainCapabilities.FactStoreRegistry);
  const [space] = useSpaces();
  const [facts, setFacts] = useState<RDF.Fact[]>([]);
  const [selected, setSelected] = useState<string | undefined>(undefined);

  useEffect(() => {
    if (!seed || !space) {
      return;
    }
    void EffectEx.runPromise(registry.forSpace(space.id).putFacts(seed)).then(() => setFacts(seed));
  }, [seed, space, registry]);

  return (
    <FactsStoryContext.Provider value={{ facts, setFacts, selected, setSelected }}>
      <ModuleContainer layout={layout} />
    </FactsStoryContext.Provider>
  );
};

const DefaultStory = () => <FactsStoryRoot layout={CRAWL_LAYOUT} />;

// A small hand-authored Alice/Bob corpus exercised by the in-memory variant.
const sampleFact = (id: string, subject: string, predicate: string, object: string, confidence: number): RDF.Fact => ({
  id,
  assertion: {
    subject: { entity: subject, label: subject === 'dxos' ? 'DXOS' : subject },
    predicate,
    object: { entity: object, label: object === 'dxos' ? 'DXOS' : object },
  },
  factuality: { value: 'CT+', polarity: '+', confidence },
  attribution: { source: `sample:${id}`, generatedAtTime: '2026-06-29T00:00:00.000Z' },
  recordedAt: '2026-06-29T00:00:00.000Z',
  extractor: { id: 'sample', model: 'sample', version: '1' },
  sourceHash: id,
});

const SAMPLE_FACTS: RDF.Fact[] = [
  sampleFact('s1', 'alice', 'works at', 'dxos', 0.95),
  sampleFact('s2', 'alice', 'met', 'bob', 0.8),
  sampleFact('s3', 'bob', 'works at', 'dxos', 0.9),
  sampleFact('s5', 'bob', 'leads', 'engineering', 0.9),
  sampleFact('s4', 'bob', 'attended', 'blueyard summit', 0.7),
];

const InMemoryStory = () => <FactsStoryRoot layout={VIEWER_LAYOUT} seed={SAMPLE_FACTS} />;

const meta = {
  title: 'stories/stories-brain/Facts',
  render: DefaultStory,
  decorators: [
    withTheme(),
    withLayout({ layout: 'fullscreen' }),
    withPluginManager({
      plugins: [
        ...corePlugins(),
        ClientPlugin({
          onClientInitialized: ({ client }) =>
            Effect.gen(function* () {
              if (!client.halo.identity.get()) {
                yield* initializeIdentity(client);
              }
            }),
        }),
        SpacePlugin({}),
        BrainPlugin(),
        CrawlerStoresPlugin(),
        StoryModulesPlugin(),
        StorybookPlugin({}),
      ],
    }),
  ],
  parameters: {
    layout: 'fullscreen',
    controls: { disable: true },
  },
} satisfies Meta<typeof DefaultStory>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const InMemory: Story = {
  render: InMemoryStory,
};
