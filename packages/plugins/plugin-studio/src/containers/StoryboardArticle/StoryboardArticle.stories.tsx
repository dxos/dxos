//
// Copyright 2026 DXOS.org
//

import { type StoryObj } from '@storybook/react-vite';
import * as Effect from 'effect/Effect';
import * as Schema from 'effect/Schema';
import React, { useEffect, useState } from 'react';

import * as Capability from '@dxos/app-framework/Capability';
import * as Plugin from '@dxos/app-framework/Plugin';
import { withPluginManager } from '@dxos/app-framework/testing';
import { DXN, Filter, Obj, Ref } from '@dxos/echo';
import { useQuery } from '@dxos/echo-react';
import { ClientPlugin, initializeIdentity } from '@dxos/plugin-client/testing';
import { PreviewPlugin } from '@dxos/plugin-preview/testing';
import { SpacePlugin } from '@dxos/plugin-space/testing';
import { corePlugins } from '@dxos/plugin-testing';
import * as StorybookPlugin from '@dxos/plugin-testing/StorybookPlugin';
import { useSpaces } from '@dxos/react-client/echo';
import { withLayout } from '@dxos/react-ui/testing';

import { StudioPlugin } from '#plugin';
import { translations } from '#translations';
import { Frame, type GenerationService, MediaArtifact, Storyboard, StudioCapabilities, Variant } from '#types';

import { StoryboardArticle } from './StoryboardArticle.tsx';

const MockRequestSchema = Schema.Struct({
  prompt: Schema.optional(Schema.String.annotate({ title: 'Prompt' })),
});

/** A keyless mock provider (kind 'image') returning placeholder images, so frames can Generate. */
const mockService: GenerationService.GenerationService = {
  kind: 'image',
  id: 'mock',
  label: 'Mock',
  contentType: 'image/png',
  requestSchema: MockRequestSchema,
  generate: async (request) => ({
    variants: [
      {
        contentType: 'image/png',
        url: `https://picsum.photos/seed/sb-${Date.now()}/512/512`,
        generation: { provider: 'mock', prompt: typeof request.prompt === 'string' ? request.prompt : undefined },
      },
    ],
  }),
};

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

const FRAMES = ['Establishing shot', 'The reveal', 'Close-up'];

const DefaultStory = () => {
  const spaces = useSpaces();
  const space = spaces[spaces.length - 1];
  const storyboards = useQuery(space?.db, Filter.type(Storyboard.Storyboard));
  const [storyboard, setStoryboard] = useState<Storyboard.Storyboard>();

  useEffect(() => {
    if (storyboards.length && !storyboard) {
      setStoryboard(storyboards[0]);
    }
  }, [storyboards]);

  if (!storyboard) {
    return null;
  }

  return <StoryboardArticle role='article' subject={storyboard} attendableId='test' />;
};

const meta = {
  title: 'plugins/plugin-studio/containers/StoryboardArticle',
  render: DefaultStory,
  decorators: [
    withLayout({ layout: 'fullscreen' }),
    withPluginManager({
      plugins: [
        ...corePlugins(),
        ClientPlugin.make({
          types: [Storyboard.Storyboard, Frame.Frame, MediaArtifact.MediaArtifact, Variant.Variant],
          onClientInitialized: ({ client }) =>
            Effect.gen(function* () {
              yield* initializeIdentity(client);
              const space = yield* Effect.promise(() => client.spaces.create());
              yield* Effect.promise(() => space.waitUntilReady());
              const storyboard = space.db.add(Storyboard.make({ name: 'Test storyboard' }));
              // Seed frames: two with a generated cover, one still to be generated.
              FRAMES.forEach((name, index) => {
                const artifact = MediaArtifact.make({ name, kind: 'image' });
                if (index < 2) {
                  const variant = space.db.add(
                    Variant.make({
                      [Obj.Parent]: artifact,
                      contentType: 'image/png',
                      url: `https://picsum.photos/seed/sb-${index}/768/432`,
                      generation: { provider: 'mock', prompt: name },
                    }),
                  );
                  Obj.update(artifact, (artifact) => {
                    artifact.variants = [Ref.make(variant)];
                    artifact.cover = Ref.make(variant);
                  });
                }
                const frame = Storyboard.appendFrame(storyboard, Frame.make({ name, artifact }));
                Obj.setParent(artifact, frame);
              });
            }),
        }),
        StudioPlugin(),
        MockProviderPlugin(),
        SpacePlugin({}),
        StorybookPlugin.make({}),
        PreviewPlugin.make(),
      ],
    }),
  ],
  parameters: {
    layout: 'fullscreen',
    translations,
  },
};

export default meta;

type Story = StoryObj<typeof meta>;

/**
 * Test:
 * 1. Three frames render expanded, each with its artifact article (two with a cover, one empty).
 * 2. Drag a frame by its handle above another — the order persists after the drop.
 * 3. Collapse a frame from its header; the caret rotates and the body slides up.
 * 4. Toolbar → Append frame → name + Type → Save: a fourth frame appears with an empty article.
 * 5. Delete a frame from its header trash — it leaves the accordion.
 */
export const Default: Story = {};
