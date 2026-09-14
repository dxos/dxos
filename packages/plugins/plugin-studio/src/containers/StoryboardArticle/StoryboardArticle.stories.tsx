//
// Copyright 2026 DXOS.org
//

import { type StoryObj } from '@storybook/react-vite';
import * as Effect from 'effect/Effect';
import React, { useEffect, useState } from 'react';
import { expect, userEvent, waitFor, within } from 'storybook/test';

import { withPluginManager } from '@dxos/app-framework/testing';
import { Filter, Obj } from '@dxos/echo';
import { useQuery } from '@dxos/echo-react';
import { ClientPlugin, initializeIdentity } from '@dxos/plugin-client/testing';
import { PreviewPlugin } from '@dxos/plugin-preview/testing';
import { SpacePlugin } from '@dxos/plugin-space/testing';
import { corePlugins } from '@dxos/plugin-testing';
import * as StorybookPlugin from '@dxos/plugin-testing/StorybookPlugin';
import { useSpaces } from '@dxos/react-client/echo';
import { useAttentionAttributes } from '@dxos/react-ui-attention';
import { withLayout } from '@dxos/react-ui/testing';

import { StudioPlugin } from '#plugin';
import { translations } from '#translations';
import { Frame, MediaArtifact, Storyboard, Variant } from '#types';

import {
  type MockArtifactProps,
  MockProviderPlugin,
  StubDeckPlugin,
  StubProjectsPlugin,
  makeMockArtifact,
} from '../../testing/index.ts';
import { FrameCompanion } from '../FrameCompanion/FrameCompanion.tsx';
import { StoryboardArticle } from './StoryboardArticle.tsx';

/** The seeded frames: what the mock provider is asked for, and whether it has answered yet. */
const FRAMES: Pick<MockArtifactProps, 'name' | 'prompt' | 'generated'>[] = [
  {
    name: 'Establishing shot',
    prompt: 'A wide shot of a studio at dawn, light through tall windows.',
    generated: true,
  },
  {
    name: 'The reveal',
    prompt: 'Slow push in on a desk where a storyboard takes shape.',
    generated: true,
  },
  {
    name: 'Close-up',
    prompt: 'A close-up of a hand pinning the last frame to the board.',
  },
];

const ATTENDABLE_ID = 'test';

const DefaultStory = () => {
  const spaces = useSpaces();
  // Marks the article as the attended surface (the deck's plank does this in the app), so the
  // nested artifact toolbar's Generate is live once the prompt is filled.
  const attentionAttributes = useAttentionAttributes(ATTENDABLE_ID);
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

  // The article beside its frame companion, the way the deck lays them out: picking a frame in
  // the stack selects it on the plank, and the companion follows the selection.
  return (
    <div className='dx-expand grid grid-cols-[1fr_28rem]' {...attentionAttributes}>
      <StoryboardArticle role='article' subject={storyboard} attendableId={ATTENDABLE_ID} />
      <div className='grid overflow-hidden border-s border-separator'>
        <FrameCompanion companionTo={storyboard} attendableId={ATTENDABLE_ID} />
      </div>
    </div>
  );
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
              // Seed frames: two with a generated cover, one still to be generated — every one with
              // its prompt, which is what the compose form opens on.
              FRAMES.forEach((props) => {
                const artifact = makeMockArtifact({ db: space.db, ...props });
                const frame = Storyboard.appendFrame(storyboard, Frame.make({ name: props.name, artifact }));
                Obj.setParent(artifact, frame);
              });
            }),
        }),
        StudioPlugin(),
        StubProjectsPlugin(),
        StubDeckPlugin(),
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
 * 1. Three previews stack on the left (two with a cover, one "Frame 3" placeholder); the first frame's
 *    cover plays in the middle and its request form shows in the companion on the right.
 * 2. Click another preview — the player and the companion switch to that frame; the row shows selected.
 * 3. Drag a preview above another — the order (and the numbering) persists after the drop.
 * 4. Toolbar → Append frame → name + Type → Save: a fourth preview appears and is selected, the
 *    companion's form empty.
 * 5. Toolbar → Delete frame — the selected frame leaves the stack and the selection falls back.
 */
export const Default: Story = {};

/**
 * Selecting the empty frame shows its seeded prompt in the companion's editor; generating fills its
 * preview: the mock provider answers with a picsum image seeded by the prompt, and the stack's
 * thumbnail follows the cover.
 */
export const TestGenerate: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const placeholder = await canvas.findByText('Frame 3', {}, { timeout: 30_000 });
    await userEvent.click(placeholder);

    // The frame's persisted request seeds the markdown editor.
    await canvas.findByText(/pinning the last frame/, {}, { timeout: 10_000 });

    const generate = await canvas.findByRole('button', { name: 'Generate' });
    await waitFor(() => expect(generate).toBeEnabled());
    await userEvent.click(generate);

    // The third row's placeholder gives way to the generated cover.
    await waitFor(() => expect(canvas.queryByText('Frame 3')).not.toBeInTheDocument(), { timeout: 10_000 });
    const previews = canvasElement.querySelectorAll('[data-testid="studio.frame-preview"] img');
    await expect(previews).toHaveLength(3);
    await expect(previews[2].getAttribute('src')).toContain('picsum.photos/seed/');
  },
};
