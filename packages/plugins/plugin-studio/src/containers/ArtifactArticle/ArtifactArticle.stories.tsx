//
// Copyright 2026 DXOS.org
//

import { type StoryObj } from '@storybook/react-vite';
import * as Effect from 'effect/Effect';
import * as Schema from 'effect/Schema';
import React, { useEffect, useState } from 'react';

import { Capability, Plugin } from '@dxos/app-framework';
import { withPluginManager } from '@dxos/app-framework/testing';
import { DXN, Filter, Obj, Ref } from '@dxos/echo';
import { useQuery } from '@dxos/echo-react';
import { ClientPlugin, initializeIdentity } from '@dxos/plugin-client/testing';
import { PreviewPlugin } from '@dxos/plugin-preview/testing';
import { StorybookPlugin, corePlugins } from '@dxos/plugin-testing';
import { useSpaces } from '@dxos/react-client/echo';
import { withLayout } from '@dxos/react-ui/testing';

import { translations } from '#translations';
import { Artifact, type GenerationService, StudioCapabilities, Variant } from '#types';

import { StudioPlugin } from '../../StudioPlugin';
import { ArtifactArticle } from './ArtifactArticle';

/** The request config the mock provider exposes (drives the schema-driven form). */
const MockRequestSchema = Schema.Struct({
  prompt: Schema.optional(Schema.String.annotations({ title: 'Prompt' })),
  style: Schema.optional(Schema.String.annotations({ title: 'Style' })),
  aspectRatio: Schema.optional(Schema.String.annotations({ title: 'Aspect ratio' })),
});

/** A keyless mock provider (kind 'image') returning placeholder images. */
const mockService: GenerationService.GenerationService = {
  kind: 'image',
  id: 'mock',
  label: 'Mock',
  contentType: 'image/png',
  requestSchema: MockRequestSchema,
  defaultRequest: { aspectRatio: '1x1' },
  generate: async (request) => {
    const prompt = typeof request.prompt === 'string' ? request.prompt : undefined;
    const count = request.count ?? 1;
    return {
      variants: Array.from({ length: count }, (_, index) => ({
        contentType: 'image/png',
        url: `https://picsum.photos/seed/gen-${index}/512/512`,
        generation: { provider: 'mock', prompt, seed: index },
      })),
    };
  },
};

/** Registers the mock provider so the toolbar shows the request form + enables Generate. */
const MockProviderPlugin = Plugin.define(
  Plugin.makeMeta({ key: DXN.make('org.dxos.plugin.studio.story.mockProvider'), name: 'Mock Provider' }),
).pipe(
  Plugin.addModule({
    id: 'story.studio.mock-provider/module',
    provides: [StudioCapabilities.GenerationService],
    activate: () => Effect.succeed([Capability.contribute(StudioCapabilities.GenerationService, mockService)]),
  }),
  Plugin.make,
);

const DefaultStory = () => {
  const spaces = useSpaces();
  const space = spaces[spaces.length - 1];
  const artifacts = useQuery(space?.db, Filter.type(Artifact.Artifact));
  const [artifact, setArtifact] = useState<Artifact.Artifact>();

  useEffect(() => {
    if (artifacts.length && !artifact) {
      setArtifact(artifacts[0]);
    }
  }, [artifacts]);

  if (!artifact) {
    return null;
  }

  return <ArtifactArticle role='article' subject={artifact} attendableId='test' />;
};

const meta_ = {
  title: 'plugins/plugin-studio/containers/ArtifactArticle',
  render: DefaultStory,
  decorators: [
    withLayout({ layout: 'fullscreen' }),
    withPluginManager({
      plugins: [
        ...corePlugins(),
        ClientPlugin({
          types: [Artifact.Artifact, Variant.Variant],
          onClientInitialized: ({ client }) =>
            Effect.gen(function* () {
              yield* initializeIdentity(client);
              const space = yield* Effect.promise(() => client.spaces.create());
              yield* Effect.promise(() => space.waitUntilReady());
              const prompt = 'A serene mountain lake at dawn.';
              const artifact = space.db.add(Artifact.make({ name: 'Test artifact', kind: 'image' }));
              // Seed a few generated variants (remote placeholders) to exercise the tabs + gallery.
              Obj.update(artifact, (artifact) => {
                artifact.variants = Array.from({ length: 3 }, (_, index) => {
                  const variant = space.db.add(
                    Variant.make({
                      name: prompt,
                      contentType: 'image/png',
                      url: `https://picsum.photos/seed/dxos-${index}/512/512`,
                      config: { prompt },
                      generation: { provider: 'mock', prompt, seed: index },
                    }),
                  );
                  Obj.setParent(variant, artifact);
                  return Ref.make(variant);
                });
                artifact.cover = artifact.variants[0];
              });
            }),
        }),
        StudioPlugin(),
        MockProviderPlugin(),
        StorybookPlugin({}),
        PreviewPlugin(),
      ],
    }),
  ],
  parameters: {
    layout: 'fullscreen',
    translations,
  },
};

export default meta_;

type Story = StoryObj<typeof meta_>;

export const Default: Story = {};
