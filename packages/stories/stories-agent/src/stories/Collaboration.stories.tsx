//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import { expect, waitFor } from 'storybook/test';

import { translations as markdownTranslations } from '@dxos/plugin-markdown/translations';
import { translations as reviewTranslations } from '@dxos/plugin-review/translations';
import { withLayout, withTheme } from '@dxos/react-ui/testing';

import { ActorArticle, type ActorStoryArgs, withActors } from '../testing/actors/index.ts';
import { echoFlow } from '../testing/flows/echo.ts';
import { markdownFlow } from '../testing/flows/markdown.ts';
import { teamFlow } from '../testing/flows/team.ts';

const meta = {
  title: 'stories/stories-agent/Collaboration',
  render: ActorArticle,
  decorators: [withTheme(), withLayout({ layout: 'fullscreen' })],
  argTypes: {
    stepped: { type: { name: 'boolean' }, control: 'boolean' },
    actor: { type: { name: 'number' }, control: 'number' },
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
  play: async ({ canvasElement }) => {
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
        // Ben's answers reach the comments panels.
        await expect(canvasElement.textContent).toContain('Design partners first');
        await expect(canvasElement.textContent).toContain('iOS is in review');
      },
      { timeout: 10_000 },
    );
  },
};

/**
 * Sixteen actors on one launch plan, with no name bars: rendered at four times 1920x1080 and cut into one clip per
 * actor, which the autocue Grid zooms out across.
 */
export const Team: Story = {
  decorators: [withActors({ flow: teamFlow, bars: false })],
  tags: ['!test'],
};

/**
 * Sixteen actors build the ECHO design document of the DXOS Architecture template from its outline: writers,
 * canvas builders, a sheet filler, reviewers and assistant users (plan: `.agents/projects/multi-actor/ECHO-SCENE.md`).
 * No name bars: rendered at four times 1920x1080 and cut into one clip per actor for the autocue Grid.
 */
export const Echo: Story = {
  decorators: [withActors({ flow: echoFlow, bars: false })],
  tags: ['!test'],
};

/**
 * The ECHO scene stepped to its end: every writer's view converges on the finished document, drafts edited away.
 * Out of the CI run (sixteen clients take minutes to step through); `tools/autocue/showcase/probe-scene.mjs` runs it.
 */
export const TestEcho: Story = {
  decorators: [withActors({ flow: echoFlow, bars: false })],
  args: { stepped: true },
  tags: ['!test'],
  play: async () => {
    await waitFor(
      async () => {
        // The scene's state in the failure message, so a stall says which actors never mounted.
        const { phase, registered, progress, errors } = window.actorScene?.status ?? {};
        await expect(window.grid, JSON.stringify({ phase, registered, progress, errors })).toBeDefined();
      },
      { timeout: 240_000 },
    );
    const grid = window.grid;
    for (let ms = 0; grid && ms <= grid.total; ms += 1_000) {
      await grid.seek(ms);
    }
    await waitFor(
      async () => {
        const status = window.actorScene?.status;
        await expect(status?.errors).toEqual([]);
        const texts = status?.texts ?? [];
        await expect(texts).toHaveLength(9);
        for (const text of texts) {
          await expect(text).toBe(texts[0]);
        }
        await expect(texts[0]).toContain('is a chain of signed credentials rooted in the identity that created it');
        await expect(texts[0]).toContain('Open questions:');
      },
      { timeout: 15_000 },
    );
  },
};
