//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useEffect, useRef, useState } from 'react';

import { SERVICES_CONFIG } from '@dxos/ai/testing';
import * as Hooks from '@dxos/app-framework/Hooks';
import * as AppActivationEvents from '@dxos/app-toolkit/AppActivationEvents';
import * as Chat from '@dxos/assistant/Chat';
import * as Skill from '@dxos/compute/Skill';
import * as EffectEx from '@dxos/effect/EffectEx';
import { RDF } from '@dxos/pipeline-rdf';
import * as AssistantPlugin from '@dxos/plugin-assistant/AssistantPlugin';
import { translations as assistantTranslations } from '@dxos/plugin-assistant/translations';
import * as BrainCapabilities from '@dxos/plugin-brain/BrainCapabilities';
import * as RoutinePlugin from '@dxos/plugin-routine/RoutinePlugin';
import { SpacePlugin } from '@dxos/plugin-space/testing';
import { Config } from '@dxos/react-client';
import { translations as rdfTranslations } from '@dxos/react-ui-rdf/translations';
import { ModuleContainer, type ModuleLayout, createStoryDecorators } from '@dxos/storybook-testing';

import { FactsStoryContext, type PredicateFilter, type QueryScope, StoryRole } from '../modules/index.ts';
import { BrainChatPlugin } from '../testing/brain-chat.ts';
import { StoryModulesPlugin } from '../testing/modules.tsx';
import { DEFAULT_FACT_SERVER_URL, RemoteFactStorePlugin } from '../testing/remote-fact-store.ts';

/**
 * Explores a fact store served over HTTP — by default the persisted Discord crawl that
 * `moon run plugin-discord:fact-server` exposes. Override the server with `VITE_FACT_SERVER_URL`. The left column is an
 * agent chat with the Brain skill over a SPARQL editor, and what either one reads scopes the facts and entities columns.
 */
const FACT_SERVER_URL = String(import.meta.env.VITE_FACT_SERVER_URL ?? DEFAULT_FACT_SERVER_URL);

const LAYOUT: ModuleLayout = [[StoryRole.Chat, StoryRole.Query], [StoryRole.Facts], [StoryRole.Entities]];

/** Reads an agent's tool makes within this long of each other belong to one lookup, so their facts are shown together. */
const LOOKUP_WINDOW_MS = 3_000;

/** Listeners for the facts the Brain operations read; the plugin is built once per story module, the listener per mount. */
const operationFactListeners = new Set<(facts: readonly RDF.Fact[]) => void>();

const ExplorerRoot = () => {
  const registry = Hooks.useCapability(BrainCapabilities.FactStoreRegistry);
  const [facts, setFacts] = useState<RDF.Fact[]>([]);
  const [selected, setSelected] = useState<string | undefined>(undefined);
  const [predicate, setPredicate] = useState<PredicateFilter | undefined>(undefined);
  const [scope, setScope] = useState<QueryScope | undefined>(undefined);
  const [error, setError] = useState<string | undefined>(undefined);

  // A tool resolves a name to several keys and queries each, so reads close together are one lookup and accumulate;
  // the graphs they read scope the views exactly as a SPARQL result binding `?g` does.
  const lookup = useRef<{ at: number; graphs: Set<string> }>({ at: 0, graphs: new Set() });
  useEffect(() => {
    const listener = (read: readonly RDF.Fact[]) => {
      const now = Date.now();
      const graphs = now - lookup.current.at > LOOKUP_WINDOW_MS ? new Set<string>() : lookup.current.graphs;
      read.forEach((fact) => graphs.add(RDF.Mapping.graphOf(fact)));
      lookup.current = { at: now, graphs };
      setScope({ graphs: new Set(graphs), iris: new Set(), literals: new Set() });
    };
    operationFactListeners.add(listener);
    return () => void operationFactListeners.delete(listener);
  }, []);

  // The remote store ignores the space id; any key reaches the server.
  useEffect(() => {
    void EffectEx.runPromise(registry.forSpace('remote').query({})).then(setFacts, (failure: unknown) =>
      setError(failure instanceof Error ? failure.message : String(failure)),
    );
  }, [registry]);

  return (
    <FactsStoryContext.Provider
      value={{ facts, setFacts, selected, setSelected, predicate, setPredicate, scope, setScope }}
    >
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
    config: new Config({ runtime: { services: SERVICES_CONFIG.REMOTE } }),
    types: [Chat.Chat, Skill.Skill],
    // Skill definitions ride the assistant's start event.
    setupEvents: [AppActivationEvents.AssistantStart],
    plugins: [
      SpacePlugin.make({}),
      AssistantPlugin.make(),
      // Copies the skill definitions into the client registry, which resolves a chat's bound skills.
      RoutinePlugin.make(),
      RemoteFactStorePlugin(FACT_SERVER_URL, {
        onOperationFacts: (facts) => operationFactListeners.forEach((listener) => listener(facts)),
      }),
      BrainChatPlugin(),
      StoryModulesPlugin(),
    ],
  }),
  parameters: {
    layout: 'fullscreen',
    controls: { disable: true },
    translations: [...assistantTranslations, ...rdfTranslations],
  },
} satisfies Meta<typeof ExplorerRoot>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
