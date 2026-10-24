//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React from 'react';
import { expect, userEvent, waitFor, within } from 'storybook/test';

import * as ProcessManagerPlugin from '@dxos/app-framework/ProcessManagerPlugin';
import { withPluginManager } from '@dxos/app-framework/testing';
import { Filter, Ref } from '@dxos/echo';
import * as Markdown from '@dxos/plugin-markdown/Markdown';
import { useQuery } from '@dxos/react-client/echo';
import { useClientStory, withClientProvider } from '@dxos/react-client/testing';
import { useAttentionAttributes } from '@dxos/react-ui-attention';
import { withAttention } from '@dxos/react-ui-attention/testing';
import { translations as editorTranslations } from '@dxos/react-ui-editor/translations';
import { translations as formTranslations } from '@dxos/react-ui-form/translations';
import { Loading, withLayout, withTheme } from '@dxos/react-ui/testing';
import { translations as reactUiTranslations } from '@dxos/react-ui/translations';
import { Text } from '@dxos/schema';

import { translations } from '#translations';
import { Presentation } from '#types';

import { SlideEditorArticle } from './SlideEditorArticle.tsx';

const TWO_COLS = [
  '---',
  'layout: two-cols',
  '---',
  '',
  '# Local-first',
  '',
  '- Data lives on the device',
  '- Sync is peer to peer',
  '',
  '::right::',
  '',
  '# Collaboration',
  '',
  '- Real-time editing',
  '- Works offline',
].join('\n');

/** Content for both columns, written before any layout is picked. */
const COLUMNS = ['# Plan', '', '- Design', '- Build', '', '::right::', '', '# Ship', '', '- Review', '- Release'].join(
  '\n',
);

const CLICKS = ['# Clicks', '', '<v-clicks>', '', '- one', '- two', '- three', '', '</v-clicks>'].join('\n');

/** Edits the presentation's slide at `slide` (default: the first, a two-column slide). */
/** Attended from the start, as a plank the user just opened. */
const ATTENDED_ID = 'story';

const DefaultStory = ({ slide: index = 0 }: { slide?: number }) => {
  const attentionAttributes = useAttentionAttributes(ATTENDED_ID);
  const { space } = useClientStory();
  const [presentation] = useQuery(space?.db, Filter.type(Presentation.Presentation));
  const texts = useQuery(space?.db, Filter.type(Text.Text));
  const section = presentation?.sections[index];
  const slide = section && texts.find((text) => Ref.hasEntityId(text.id)(section));
  if (!slide) {
    return <Loading />;
  }

  return (
    // The article's attention region, as a plank provides it: the formatting toolbar is enabled only while attended.
    <div className='contents' {...attentionAttributes}>
      <SlideEditorArticle role='article' attendableId={ATTENDED_ID} subject={slide} />
    </div>
  );
};

const meta = {
  title: 'plugins/plugin-presenter/containers/SlideEditorArticle',
  render: DefaultStory,
  decorators: [
    withTheme(),
    withLayout({ layout: 'fullscreen' }),
    withClientProvider({
      types: [Presentation.Presentation, Text.Text, Markdown.Document],
      createIdentity: true,
      createSpace: true,
      onCreateSpace: async ({ space }) => {
        const presentation = space.db.add(
          Presentation.make({ name: 'Demo', slides: [TWO_COLS, '# Two', CLICKS, '', COLUMNS] }),
        );
        Presentation.link(presentation, space.db.add(Markdown.make({ name: 'Notes', content: '# Notes' })));
        await space.db.flush({ indexes: true });
      },
    }),
    // The process manager provides the operation invoker the toolbar's navigation uses.
    withPluginManager({ plugins: [ProcessManagerPlugin.make()] }),
    // Outermost, so the plugin manager's atom registry is not replaced by the decorator's own.
    withAttention(ATTENDED_ID),
  ],
  parameters: {
    layout: 'fullscreen',
    translations: [...translations, ...editorTranslations, ...formTranslations, ...reactUiTranslations],
  },
} satisfies Meta<typeof DefaultStory>;

export default meta;

type Story = StoryObj<typeof meta>;

const LOAD_TIMEOUT = { timeout: 10_000 };

/** Matches a whole editor line, since CodeMirror splits a list line into several spans. */
const editorLine = (text: string) => (_content: string, element: Element | null) =>
  !!element?.classList.contains('cm-line') && element.textContent === text;

const preview = (canvasElement: HTMLElement) =>
  within(within(canvasElement).getByTestId('presenter.slide-editor.preview'));

/** A two-column slide; typing at its end adds to the right column of the slide shown below. */
export const Default: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const editor = await canvas.findByRole('textbox', undefined, LOAD_TIMEOUT);
    await expect(await preview(canvasElement).findByRole('heading', { name: 'Collaboration' })).toBeVisible();
    await userEvent.click(editor);
    await userEvent.keyboard('{ArrowDown>20/}{End}{Enter}- Comments');
    const right = await waitFor(() => {
      const slot = canvasElement.querySelector('[data-testid="presenter.slide-editor.preview"] [data-slot="right"]');
      if (!slot) {
        throw new Error('Missing right column');
      }
      return slot;
    });
    await waitFor(() => expect(right.textContent).toContain('Comments'));
    const previewBox = canvas.getByTestId('presenter.slide-editor.preview').getBoundingClientRect();
    await expect(previewBox.top).toBeGreaterThan(editor.getBoundingClientRect().top);
  },
};

/** Picking `two-cols` writes `layout:` into the slide, and the preview shows both columns' content. */
export const Layout: Story = {
  args: { slide: 4 },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await canvas.findByRole('textbox', undefined, LOAD_TIMEOUT);
    await userEvent.click(await canvas.findByTestId('presenter.slide-toolbar.layout'));
    await userEvent.click(await within(document.body).findByTestId('presenter.slide-toolbar.layout.two-cols'));
    await waitFor(() =>
      expect(
        canvasElement.querySelector('[data-testid="presenter.slide-editor.preview"] [data-layout="two-cols"]'),
      ).not.toBeNull(),
    );
    await expect(canvas.getByRole('textbox').textContent).toContain('layout: two-cols');
    const right = canvasElement.querySelector('[data-testid="presenter.slide-editor.preview"] [data-slot="right"]');
    await expect(right?.textContent).toContain('Ship');
  },
};

/** "Reveal on click" inserts a click group and leaves the cursor inside it. */
export const InsertClick: Story = {
  args: { slide: 3 },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const editor = await canvas.findByRole('textbox', undefined, LOAD_TIMEOUT);
    await userEvent.click(editor);
    await userEvent.click(await canvas.findByTestId('presenter.slide-toolbar.click'));
    // Chosen by keyboard: zag's menu does not take testing-library's synthetic pointer sequence as a selection.
    await within(document.body).findByTestId('presenter.insert-click');
    await userEvent.keyboard('{ArrowDown}{Enter}');
    // The insert waits for the menu to close and return focus, then focuses the editor inside the group.
    await waitFor(() => expect(editor.textContent).toContain('<v-click>'));
    await waitFor(() => expect(editor).toHaveFocus());
    await userEvent.keyboard('Later');
    await waitFor(() => expect(editor.textContent).toContain('<v-click>Later</v-click>'));
    await expect(await preview(canvasElement).findByText('Later')).toBeInTheDocument();
  },
};

/** With the cursor on a `<v-clicks>` item, the preview reveals the list up to that item. */
export const CursorStep: Story = {
  args: { slide: 2 },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await canvas.findByRole('textbox', undefined, LOAD_TIMEOUT);
    const hidden = () =>
      canvasElement.querySelectorAll('[data-testid="presenter.slide-editor.preview"] li.invisible').length;
    await waitFor(() => expect(hidden()).toBe(0));
    // A synthetic click has no coordinates for CodeMirror to place the cursor, so it is moved by key instead.
    await userEvent.click(await canvas.findByText(editorLine('- one')));
    await userEvent.keyboard('{ArrowUp>8/}{ArrowDown>4/}');
    await waitFor(() => expect(hidden()).toBe(2));
    await userEvent.keyboard('{ArrowDown}');
    await waitFor(() => expect(hidden()).toBe(1));
  },
};

/** Clicking an element in the preview puts the caret at the start of its source. */
export const SourceClick: Story = {
  args: { slide: 1 },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const editor = await canvas.findByRole('textbox', undefined, LOAD_TIMEOUT);
    await userEvent.click(await preview(canvasElement).findByRole('heading', { name: 'Two' }));
    // The caret lands at the start of the heading's source, so typing inserts before it.
    await userEvent.keyboard('# One{Enter}');
    await waitFor(() => expect(editor.textContent).toBe('# One# Two'));
    await expect(await preview(canvasElement).findByRole('heading', { name: 'One' })).toBeVisible();
    await expect(preview(canvasElement).getByRole('heading', { name: 'Two' })).toBeVisible();
  },
};
