//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import { expect, waitFor } from 'storybook/test';

import { translations as markdownTranslations } from '@dxos/plugin-markdown/translations';
import { translations as reviewTranslations } from '@dxos/plugin-review/translations';
import { withLayout, withTheme } from '@dxos/react-ui/testing';

import { ActorArticle, type ActorStoryArgs, withActors } from '../testing/actors/index.ts';
import { markdownFlow } from './flows/markdown.ts';

const meta = {
  title: 'stories/stories-agent/Collaboration',
  render: ActorArticle,
  decorators: [withTheme(), withLayout({ layout: 'fullscreen' })],
  argTypes: {
    stepped: { type: { name: 'boolean' }, control: 'boolean' },
  },
  parameters: {
    layout: 'fullscreen',
    translations: [...markdownTranslations, ...reviewTranslations],
  },
} satisfies Meta<ActorStoryArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

/**
 * Four actors, each a separate identity in its own app, on one new markdown document: Ada and Ben write
 * their own sections, Cleo fixes their typos, Dev highlights phrases and opens comment threads.
 */
export const Markdown: Story = {
  decorators: [withActors({ flow: markdownFlow })],
  tags: ['!test'],
};

/**
 * The same scene stepped through scene time as fast as it settles, as the frame renderer does: every
 * actor's editor converges on the finished text, and Dev's three threads reach every actor.
 */
export const TestMarkdown: Story = {
  decorators: [withActors({ flow: markdownFlow })],
  args: { stepped: true },
  play: async () => {
    await waitFor(() => expect(window.grid).toBeDefined(), { timeout: 45_000 });
    const grid = window.grid;
    // Coarse steps: each seek waits for replication, and the test only needs the end state.
    for (let ms = 0; grid && ms <= grid.total; ms += 500) {
      await grid.seek(ms);
    }

    await waitFor(
      async () => {
        // The actors' article editors, not the comment composers, which are editors too.
        const views = window.actorScene?.views ?? [];
        await expect(views).toHaveLength(markdownFlow.actors.length);
        for (const view of views) {
          const text = view?.state.doc.toString();
          await expect(text).toContain('Mobile apps ship in the same release.');
          await expect(text).toContain('a fortnight later');
          await expect(view?.dom.querySelectorAll('.cm-comment').length).toBeGreaterThanOrEqual(3);
        }
      },
      { timeout: 10_000 },
    );
  },
};
