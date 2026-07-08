//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import * as Effect from 'effect/Effect';
import * as Schema from 'effect/Schema';
import React from 'react';

import { Capability } from '@dxos/app-framework';
import { withPluginManager } from '@dxos/app-framework/testing';
import { AppCapabilities } from '@dxos/app-toolkit';
import { DXN, Filter, Obj, Type } from '@dxos/echo';
import { LabelAnnotation } from '@dxos/echo/Annotation';
import { type RDF } from '@dxos/pipeline-rdf';
import { ClientPlugin } from '@dxos/plugin-client/testing';
import { StorybookPlugin, corePlugins } from '@dxos/plugin-testing';
import { useQuery, useSpaces } from '@dxos/react-client/echo';
import { Loading, withLayout } from '@dxos/react-ui/testing';

import { translations } from '#translations';
import { BrainCapabilities, makeFactStoreRegistry } from '#types';

import { FactsCompanion } from './FactsCompanion';

class NoteType extends Type.makeObject<NoteType>(DXN.make('org.dxos.type.test.brainNote', '0.1.0'))(
  Schema.Struct({
    name: Schema.optional(Schema.String),
  }).pipe(LabelAnnotation.set(['name'])),
) {}

const makeFact = (id: string, subject: string, predicate: string, object: string, confidence: number): RDF.Fact => ({
  id,
  assertion: {
    subject: { entity: subject.toLowerCase().replace(/\s+/g, '-'), label: subject },
    predicate,
    object: { entity: object.toLowerCase().replace(/\s+/g, '-'), label: object },
  },
  factuality: { value: confidence > 0.8 ? 'CT+' : 'PR+', polarity: '+', confidence, nature: 'epistemic' },
  attribution: { source: 'dxn:echo:@:story-message', generatedAtTime: '2026-07-01T00:00:00.000Z' },
  recordedAt: '2026-07-01T12:00:00.000Z',
  extractor: { id: 'story', model: 'stub', version: '1' },
  sourceHash: 'story-hash',
});

const FACTS: RDF.Fact[] = [
  makeFact('f-1', 'Alice Smith', 'works-at', 'Acme Corp', 0.95),
  makeFact('f-2', 'Alice Smith', 'travels-to', 'Paris', 0.6),
  makeFact('f-3', 'Bob Jones', 'works-at', 'Acme Corp', 0.85),
  makeFact('f-4', 'Acme Corp', 'headquartered-in', 'Berlin', 0.9),
];

// Shared with the ClientPlugin seed callback so the story reads the same per-space store.
const registry = makeFactStoreRegistry();

const DefaultStory = () => {
  const spaces = useSpaces();
  const space = spaces[spaces.length - 1];
  const [subject] = useQuery(space?.db, Filter.type(NoteType));
  if (!subject) {
    return <Loading />;
  }

  return <FactsCompanion subject={subject} />;
};

const meta = {
  title: 'plugins/plugin-brain/containers/FactsCompanion',
  render: DefaultStory,
  decorators: [
    withLayout({ layout: 'fullscreen' }),
    withPluginManager({
      capabilities: [
        Capability.contributes(AppCapabilities.Translations, translations),
        Capability.contributes(BrainCapabilities.FactStoreRegistry, registry),
      ],
      plugins: [
        ...corePlugins(),
        StorybookPlugin({}),
        ClientPlugin({
          types: [NoteType],
          onClientInitialized: ({ client }) =>
            Effect.gen(function* () {
              yield* Effect.promise(() => client.halo.createIdentity());
              const space = yield* Effect.promise(() => client.spaces.create());
              yield* Effect.promise(() => space.waitUntilReady());
              space.db.add(Obj.make(NoteType, { name: 'Companioned object' }));
              yield* registry.forSpace(space.id).putFacts(FACTS).pipe(Effect.orDie);
            }),
        }),
      ],
    }),
  ],
  parameters: {
    layout: 'fullscreen',
    translations,
  },
} satisfies Meta<typeof DefaultStory>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
