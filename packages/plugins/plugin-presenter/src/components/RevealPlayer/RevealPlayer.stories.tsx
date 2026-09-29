//
// Copyright 2023 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useMemo, useState } from 'react';
import { expect, userEvent, waitFor } from 'storybook/test';

import { useThemeContext } from '@dxos/react-ui';
import { Editor } from '@dxos/react-ui-editor';
import { withLayout, withTheme } from '@dxos/react-ui/testing';
import { createBasicExtensions, createMarkdownExtensions, createThemeExtensions } from '@dxos/ui-editor';

import { translations } from '#translations';

import CONTENT from '../../../testing/deck.md?raw';
import { RevealPlayer, type RevealProps } from './RevealPlayer.tsx';

// https://revealjs.com/markdown
// https://developer.mozilla.org/en-US/docs/Web/CSS/background-position
// https://colorhunt.co/palettes/dark
// https://colorhunt.co/palette/ff204ea0153e5d0e4100224d
// https://colorhunt.co/palette/27374d526d829db2bfdde6ed
// https://fontsource.org/fonts
// https://fonts.google.com

const meta = {
  title: 'plugins/plugin-presenter/components/RevealPlayer',
  component: RevealPlayer,
  decorators: [withTheme(), withLayout({ layout: 'fullscreen' })],
  parameters: {
    layout: 'fullscreen',
    translations,
  },
} satisfies Meta<typeof RevealPlayer>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    fullscreen: true,
    content: CONTENT,
  },
};

const REVEAL_SCROLL_ACTIVATION_WIDTH = 435;

const typeAtLineEnd = async (canvasElement: HTMLElement, line: string, text: string) => {
  const index = Array.from(canvasElement.querySelectorAll('.cm-line')).findIndex((element) =>
    element.textContent?.startsWith(line),
  );
  await expect(index).toBeGreaterThanOrEqual(0);
  await userEvent.click(canvasElement.querySelector<HTMLElement>('.cm-content')!);
  await userEvent.keyboard(`${index > 0 ? `{ArrowDown>${index}/}` : ''}{End}${text}`);
};

const EditorStory = (props: RevealProps) => {
  const { themeMode } = useThemeContext();
  const [content, setContent] = useState(props.content);
  const extensions = useMemo(
    () => [createBasicExtensions(), createThemeExtensions({ themeMode }), createMarkdownExtensions()],
    [themeMode],
  );

  return (
    <div className='grid grid-cols-2 dx-fill'>
      <div className='overflow-y-auto border-e border-separator'>
        <Editor.Root extensions={extensions}>
          <Editor.View classNames='p-4' value={content} onChange={setContent} />
        </Editor.Root>
      </div>
      <RevealPlayer {...props} fullscreen={false} content={content} />
    </div>
  );
};

export const WithEditor: Story = {
  render: EditorStory,
  args: {
    content: [
      '# Presenter',
      'Edit the markdown on the left and the deck follows.',
      '---',
      '## Slides',
      '- Separate slides with a `---` line',
      '- The deck stays on the current slide while you type',
      '---',
      '## Code',
      '```ts\nconst total = [1, 2, 3].reduce((sum, value) => sum + value, 0);\n```',
    ].join('\n\n'),
  },
};

export const TestEditor: Story = {
  render: EditorStory,
  args: {
    content: [
      '# Alpha',
      '<!-- .slide: data-visibility="hidden" -->\n\n# Hidden',
      ['# Beta', '- step <!-- .element: class="fragment" -->', '```ts []\nconst x = 1;\n```'].join('\n\n'),
    ].join('\n\n---\n\n'),
  },
  play: async ({ canvasElement }) => {
    const headings = () =>
      Array.from(canvasElement.querySelectorAll('.slides section h1')).map((heading) => heading.textContent);
    const present = () => canvasElement.querySelector<HTMLElement>('.slides section.present');
    const next = () => canvasElement.querySelector<HTMLElement>('.controls .navigate-right');

    await waitFor(() => expect(headings()).toEqual(['Alpha', 'Beta']));
    await expect(next()).not.toBeNull();
    await userEvent.click(next()!);
    await waitFor(() => expect(present()?.querySelector('h1')?.textContent).toBe('Beta'));
    await userEvent.click(next()!);
    await waitFor(() => expect(present()?.querySelectorAll('.fragment.visible')).toHaveLength(1));
    await expect(present()?.querySelector('pre.code-wrapper .hljs-ln')).not.toBeNull();

    await typeAtLineEnd(canvasElement, '# Beta', ' edited');
    await typeAtLineEnd(canvasElement, 'const x', '{ArrowDown}{End}{Enter}{Enter}---{Enter}{Enter}# Gamma');

    await waitFor(() => expect(headings()).toEqual(['Alpha', 'Beta edited', 'Gamma']));
    await expect(present()?.querySelector('h1')?.textContent).toBe('Beta edited');
    await expect(present()?.querySelectorAll('.fragment.visible')).toHaveLength(1);
    await expect(present()?.querySelector('pre.code-wrapper .hljs-ln')).not.toBeNull();
  },
};

export const TestEditorNarrow: Story = {
  render: (args) => (
    <div className='w-[640px] h-full'>
      <EditorStory {...args} />
    </div>
  ),
  args: {
    content: ['# Alpha', '# Beta\n\n- step <!-- .element: class="fragment" -->'].join('\n\n---\n\n'),
  },
  play: async ({ canvasElement }) => {
    const headings = () =>
      Array.from(canvasElement.querySelectorAll('.slides section h1')).map((heading) => heading.textContent);
    const present = () => canvasElement.querySelector<HTMLElement>('.slides section.present');
    const next = () => canvasElement.querySelector<HTMLElement>('.controls .navigate-right');

    await waitFor(() => expect(headings()).toEqual(['Alpha', 'Beta']));
    await expect(canvasElement.querySelector<HTMLElement>('.reveal')!.offsetWidth).toBeLessThan(
      REVEAL_SCROLL_ACTIVATION_WIDTH,
    );
    await expect(next()).not.toBeNull();
    await userEvent.click(next()!);
    await userEvent.click(next()!);
    await waitFor(() => expect(present()?.querySelectorAll('.fragment.visible')).toHaveLength(1));

    await typeAtLineEnd(canvasElement, '# Alpha', ' edited');

    await waitFor(() => expect(headings()).toEqual(['Alpha edited', 'Beta']));
    await expect(present()?.querySelector('h1')?.textContent).toBe('Beta');
    await expect(present()?.querySelectorAll('.fragment.visible')).toHaveLength(1);
  },
};
