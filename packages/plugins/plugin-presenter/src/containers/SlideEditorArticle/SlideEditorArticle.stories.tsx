//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useEffect } from 'react';
import { expect, userEvent, waitFor, within } from 'storybook/test';

import * as ProcessManagerPlugin from '@dxos/app-framework/ProcessManagerPlugin';
import { withPluginManager } from '@dxos/app-framework/testing';
import { Filter, Obj } from '@dxos/echo';
import { useResolveRef } from '@dxos/echo-react';
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

const CODE = ['# Code', '', '```ts', 'const answer = 42;', '```'].join('\n');

const CLICKS = ['# Clicks', '', '<v-clicks>', '', '- one', '- two', '- three', '', '</v-clicks>'].join('\n');

/** Edits the presentation's slide at `slide` (default: the first, a two-column slide). */
/** Attended from the start, as a plank the user just opened. */
const ATTENDED_ID = 'story';

const DefaultStory = ({ slide: index = 0 }: { slide?: number }) => {
  const attentionAttributes = useAttentionAttributes(ATTENDED_ID);
  const { space } = useClientStory();
  const [presentation] = useQuery(space?.db, Filter.type(Presentation.Presentation));
  const slideObject = useResolveRef(presentation?.slides[index]);
  const content = useResolveRef(slideObject?.content);
  const slide = content && Obj.instanceOf(Text.Text, content) ? content : undefined;
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

/** The editor on the second slide after the first slide's content is deleted, which leaves its slide behind. */
const DeletedFirstStory = () => {
  const { space } = useClientStory();
  const [presentation] = useQuery(space?.db, Filter.type(Presentation.Presentation));
  const first = useResolveRef(presentation?.slides[0]);
  const deleted = useResolveRef(first?.content);
  useEffect(() => {
    if (deleted) {
      space?.db.remove(deleted);
    }
  }, [deleted, space]);
  return <DefaultStory slide={1} />;
};

const meta = {
  title: 'plugins/plugin-presenter/containers/SlideEditorArticle',
  render: DefaultStory,
  decorators: [
    withTheme(),
    withLayout({ layout: 'fullscreen' }),
    withClientProvider({
      types: [Presentation.Presentation, Presentation.Slide, Text.Text, Markdown.Document],
      createIdentity: true,
      createSpace: true,
      onCreateSpace: async ({ space }) => {
        const presentation = space.db.add(
          Presentation.make({ name: 'Demo', slides: [TWO_COLS, '# Two', CLICKS, '', COLUMNS, CODE] }),
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
/** A section whose slide was deleted is no slide to go back to, so on what is now the first slide, Previous is off. */
export const DeletedSection: Story = {
  render: DeletedFirstStory,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const previous = await canvas.findByTestId('presenter.slide-toolbar.previous', undefined, LOAD_TIMEOUT);
    await waitFor(() => expect(previous).toBeDisabled());
    await expect(canvas.getByTestId('presenter.slide-toolbar.next')).toBeEnabled();
  },
};

/** Fenced code is decorated as in the markdown editor: its lines are a shaded block. */
export const CodeBlock: Story = {
  args: { slide: 5 },
  play: async ({ canvasElement }) => {
    await waitFor(
      () => expect(canvasElement.querySelectorAll('.cm-codeblock-line').length).toBeGreaterThan(0),
      LOAD_TIMEOUT,
    );
  },
};

export const Default: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const editor = await canvas.findByRole('textbox', undefined, LOAD_TIMEOUT);
    await expect(await preview(canvasElement).findByRole('heading', { name: 'Collaboration' })).toBeVisible();
    await userEvent.click(editor);
    // Enter at the end of a list item starts the next item, so only its text is typed.
    await userEvent.keyboard('{ArrowDown>20/}{End}{Enter}Comments');
    const right = await waitFor(() => {
      const slot = canvasElement.querySelector('[data-testid="presenter.slide-editor.preview"] [data-slot="right"]');
      if (!slot) {
        throw new Error('Missing right column');
      }
      return slot;
    });
    await waitFor(() => expect(right.querySelector('li:last-child')?.textContent).toBe('Comments'));
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

/** A slot marker is one unit: the caret steps over `::right::` in one move, and Backspace deletes it whole. */
export const AtomicMarker: Story = {
  args: { slide: 0 },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const editor = await canvas.findByRole('textbox', undefined, LOAD_TIMEOUT);
    // A synthetic click has no coordinates for CodeMirror to place the cursor, so it is moved by key instead.
    await userEvent.click(await canvas.findByText(editorLine('- Sync is peer to peer')));
    // To the blank line above the marker, onto the marker's start, then one step past the whole marker.
    await userEvent.keyboard('{ArrowUp>8/}{ArrowDown>8/}{Home}{ArrowRight}{ArrowRight}X');
    await waitFor(() => expect(editor.textContent).toContain('::right::X'));
    await userEvent.keyboard('{Backspace}{Backspace}');
    await waitFor(() => expect(editor.textContent).not.toContain('::right::'));
  },
};

/** Typing a `layout:` value offers the matching layouts with their names; picking one changes the slide. */
export const LayoutCompletion: Story = {
  args: { slide: 0 },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const editor = await canvas.findByRole('textbox', undefined, LOAD_TIMEOUT);
    // A synthetic click has no coordinates for CodeMirror to place the cursor, so it is moved by key instead.
    await userEvent.click(await canvas.findByText(editorLine('- Sync is peer to peer')));
    // To the end of `layout: two-cols`, then replace the value.
    await userEvent.keyboard('{ArrowUp>8/}{ArrowDown}{End}{Backspace>8/}q');
    const option = await within(document.body).findByRole('option', { name: /quote/ });
    await expect(option).toHaveTextContent('Quote');
    await userEvent.click(option);
    await waitFor(() => expect(editor.textContent).toContain('layout: quote'));
    await waitFor(() => expect(preview(canvasElement).queryByText('Collaboration')).toBeNull());
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
