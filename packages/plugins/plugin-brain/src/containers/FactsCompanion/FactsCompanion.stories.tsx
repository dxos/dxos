//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import * as Effect from 'effect/Effect';
import React from 'react';

import { withPluginManager } from '@dxos/app-framework/testing';
import { Fact } from '@dxos/echo-memory';
import * as EffectEx from '@dxos/effect/EffectEx';
import { ClientPlugin, initializeIdentity } from '@dxos/plugin-client/testing';
import * as CorePlugins from '@dxos/plugin-testing/CorePlugins';
import * as StorybookPlugin from '@dxos/plugin-testing/StorybookPlugin';
import { withLayout, withTheme } from '@dxos/react-ui/testing';
import { translations as reactUiTranslations } from '@dxos/react-ui/translations';

import { FactsCompanion } from './FactsCompanion.tsx';

// A shared registry contributed as the `FactStoreRegistry` capability and seeded (below) for the story's
// space, so `FactsCompanion` (space-scoped via `useActiveSpace`) renders real facts.
/** Minimal RDF fact fixture (subject —predicate→ object) for the viewer. */
const fact = (id: string, subject: string, predicate: string, object: string): Fact.Fact =>
  Fact.make({
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

const FACTS: Fact.Fact[] = [fact('f1', 'Alice', 'worksAt', 'Acme'), fact('f2', 'Alice', 'knows', 'Bob')];

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
          onClientInitialized: ({ client }) =>
            Effect.gen(function* () {
              const { defaultSpace } = yield* initializeIdentity(client);
              yield* Effect.promise(() => EffectEx.runPromise(client.memory(defaultSpace.id).put(FACTS)));
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
