//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useEffect, useState } from 'react';

import * as Hooks from '@dxos/app-framework/Hooks';
import * as EffectEx from '@dxos/effect/EffectEx';
import { type RDF } from '@dxos/pipeline-rdf';
import * as BrainCapabilities from '@dxos/plugin-brain/BrainCapabilities';
import { SpacePlugin } from '@dxos/plugin-space/testing';
import { ModuleContainer, type ModuleLayout, createStoryDecorators } from '@dxos/storybook-testing';

import { FactsStoryContext, StoryRole } from '../modules/index.ts';
import { StoryModulesPlugin } from '../testing/modules.tsx';
import { DEFAULT_FACT_SERVER_URL, RemoteFactStorePlugin } from '../testing/remote-fact-store.ts';

/**
 * Explores a fact store served over HTTP — by default the persisted Discord crawl that
 * `moon run plugin-discord:fact-server` exposes. Override the server with `VITE_FACT_SERVER_URL`.
 */
const FACT_SERVER_URL = String(import.meta.env.VITE_FACT_SERVER_URL ?? DEFAULT_FACT_SERVER_URL);

const LAYOUT: ModuleLayout = [[StoryRole.Query], [StoryRole.Facts], [StoryRole.Entities]];

const ExplorerRoot = () => {
  const registry = Hooks.useCapability(BrainCapabilities.FactStoreRegistry);
  const [facts, setFacts] = useState<RDF.Fact[]>([]);
  const [selected, setSelected] = useState<string | undefined>(undefined);
  const [error, setError] = useState<string | undefined>(undefined);

  // The remote store ignores the space id; any key reaches the server.
  useEffect(() => {
    void EffectEx.runPromise(registry.forSpace('remote').query({})).then(setFacts, (failure: unknown) =>
      setError(failure instanceof Error ? failure.message : String(failure)),
    );
  }, [registry]);

  return (
    <FactsStoryContext.Provider value={{ facts, setFacts, selected, setSelected }}>
      {error && (
        <div className='p-2 text-sm text-error-text'>
          {error} — start it with <code>moon run plugin-discord:fact-server</code>.
        </div>
      )}
      <ModuleContainer layout={LAYOUT} />
    </FactsStoryContext.Provider>
  );
};

const meta = {
  title: 'stories/stories-brain/FactExplorer',
  render: ExplorerRoot,
  decorators: createStoryDecorators({
    plugins: [SpacePlugin.make({}), RemoteFactStorePlugin(FACT_SERVER_URL), StoryModulesPlugin()],
  }),
  parameters: {
    layout: 'fullscreen',
    controls: { disable: true },
  },
} satisfies Meta<typeof ExplorerRoot>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
