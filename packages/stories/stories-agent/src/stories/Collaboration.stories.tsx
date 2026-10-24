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
  play: async ({ canvasElement }) => {
    // Every actor's editor converges on the finished text.
    await waitFor(
      () => {
        const editors = [...canvasElement.querySelectorAll('.cm-content')];
        expect(editors).toHaveLength(markdownFlow.actors.length);
        for (const editor of editors) {
          expect(editor.textContent).toContain('Mobile apps ship in the same release.');
          expect(editor.textContent).toContain('a fortnight later');
        }
      },
      { timeout: 90_000 },
    );
  },
};
