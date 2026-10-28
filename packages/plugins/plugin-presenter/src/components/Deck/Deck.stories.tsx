//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import * as Effect from 'effect/Effect';
import React, { useMemo, useState } from 'react';
import { expect, fn, userEvent, waitFor, within } from 'storybook/test';

import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Capability from '@dxos/app-framework/Capability';
import * as Plugin from '@dxos/app-framework/Plugin';
import * as Surface from '@dxos/app-framework/Surface';
import { withPluginManager } from '@dxos/app-framework/testing';
import * as AppSurface from '@dxos/app-toolkit/AppSurface';
import { DXN } from '@dxos/keys';
import * as Markdown from '@dxos/plugin-markdown/Markdown';
import { withClientProvider } from '@dxos/react-client/testing';
import * as Panel from '@dxos/react-ui/Panel';
import { withLayout, withTheme } from '@dxos/react-ui/testing';
import * as Toolbar from '@dxos/react-ui/Toolbar';
import { Text } from '@dxos/schema';

import { type SlideSource } from '#deck';
import { useSlideIndex } from '#hooks';
import { translations } from '#translations';

import * as Deck from './Deck.tsx';

type DeckPanelProps = Omit<Deck.RootProps, 'children'>;

/** The single-slide deck as `DocumentArticle` composes it: toolbar, viewport and pager; fullscreen is the slide alone. */
const DeckPanel = (props: DeckPanelProps) => (
  <Deck.Root {...props}>
    <Panel.Root asChild>
      <Deck.Content>
        {!props.fullscreen && (
          <Panel.Header>
            <Toolbar.Root>
              <div className='grow' />
              <Deck.PlayButton />
            </Toolbar.Root>
          </Panel.Header>
        )}
        <Panel.Body asChild>
          <Deck.Viewport />
        </Panel.Body>
        {!props.fullscreen && (
          <Panel.Footer>
            <div className='flex items-center justify-center gap-4'>
              <Deck.Pager />
              <Deck.PageNumber />
            </div>
          </Panel.Footer>
        )}
      </Deck.Content>
    </Panel.Root>
  </Deck.Root>
);

const createTextSlides = (count: number): SlideSource[] =>
  Array.from({ length: count }, (_, index) => ({
    kind: 'text' as const,
    id: `slide-${index}`,
    text: Text.make({ content: `# Slide ${index + 1}` }),
  }));

const createClickSlides = (): SlideSource[] =>
  [['# Clicks', '', '<v-clicks>', '', '- one', '- two', '- three', '', '</v-clicks>'].join('\n'), '# Plain'].map(
    (content, index) => ({ kind: 'text' as const, id: `click-${index}`, text: Text.make({ content }) }),
  );

const ClickStepsStory = () => {
  const slides = useMemo(() => createClickSlides(), []);
  const [index, setIndex] = useState(0);
  return <DeckPanel slides={slides} index={index} onIndexChange={setIndex} />;
};

/** The click slide comes last, so advancing past it has no next slide to go to. */
const ClickStepsLastStory = () => {
  const slides = useMemo(() => createClickSlides().reverse(), []);
  const [index, setIndex] = useState(0);
  return <DeckPanel slides={slides} index={index} onIndexChange={setIndex} />;
};

const CLICKS_MARKDOWN = ['<v-clicks>', '', '- one', '- two', '- three', '', '</v-clicks>'].join('\n');

/** A previewed document whose current slide is replaced in place, as a live edit does; ids stay positional. */
const EditedSlideStory = () => {
  const [content, setContent] = useState(`# Before\n\n${CLICKS_MARKDOWN}`);
  const slides = useMemo((): SlideSource[] => [{ kind: 'markdown', id: 'doc:0', content }], [content]);
  const [index, setIndex] = useState(0);
  return (
    <div className='contents'>
      <button data-testid='replace-slide' onClick={() => setContent(`# After\n\n${CLICKS_MARKDOWN}`)}>
        Replace
      </button>
      <DeckPanel slides={slides} index={index} onIndexChange={setIndex} />
    </div>
  );
};

const DefaultStory = ({ count = 5, ...props }: Partial<DeckPanelProps> & { count?: number }) => {
  const slides = useMemo(() => createTextSlides(count), [count]);
  const [index, setIndex] = useState(0);
  const [fullscreen, setFullscreen] = useState(props.fullscreen ?? false);
  return (
    <DeckPanel
      {...props}
      slides={slides}
      index={index}
      onIndexChange={setIndex}
      fullscreen={fullscreen}
      onFullscreenChange={(next) => {
        setFullscreen(next);
        props.onFullscreenChange?.(next);
      }}
    />
  );
};

const EditableStory = () => {
  const slides = useMemo(
    (): SlideSource[] =>
      [0, 1].map((index) => ({
        kind: 'object' as const,
        id: `object-${index}`,
        object: Markdown.make({ name: `Doc ${index}`, content: '# Editable' }),
      })),
    [],
  );
  const [index, setIndex] = useState(0);
  return <DeckPanel slides={slides} index={index} onIndexChange={setIndex} />;
};

/** Markdown slides whose first slide names a theme in its headmatter; `theme` props override it. */
const ThemedStory = ({ theme }: Pick<DeckPanelProps, 'theme'>) => {
  const slides = useMemo(
    (): SlideSource[] =>
      [
        ['---', 'theme: light', '---', '', '# Light theme', '', 'Named by the first slide.'].join('\n'),
        ['# Every slide', '', '```ts', "const deck = 'themed';", '```'].join('\n'),
      ].map((content, index) => ({ kind: 'markdown', id: `themed-${index}`, content })),
    [],
  );
  const [index, setIndex] = useState(0);
  return <DeckPanel slides={slides} index={index} onIndexChange={setIndex} theme={theme} />;
};

/** Index is far past the end, as when slides were deleted since the view state was saved. */
const StaleIndexStory = () => {
  const slides = useMemo(() => createTextSlides(3), []);
  const [, setIndex] = useSlideIndex('stale-index-story', slides.length);
  return <DeckPanel slides={slides} index={9} onIndexChange={setIndex} />;
};

const InputSlide = () => (
  <>
    <input data-testid='slide-input' />
    <div data-testid='slide-editable' contentEditable suppressContentEditableWarning tabIndex={0} />
    <select data-testid='slide-select'>
      <option>a</option>
      <option>b</option>
    </select>
    <div data-testid='slide-slider' role='slider' aria-valuenow={0} tabIndex={0} />
  </>
);

const createInputPlugin = () =>
  Plugin.define(
    Plugin.makeMeta({ key: DXN.make('org.dxos.plugin.test.presenterInput'), name: 'PresenterInputStory' }),
  ).pipe(
    Plugin.addModule({
      id: 'surfaces',
      provides: [Capabilities.ReactSurface],
      activate: () =>
        Effect.succeed(
          Capability.contribute(Capabilities.ReactSurface, [
            Surface.create({
              id: 'slide',
              filter: AppSurface.object(AppSurface.Slide, Markdown.Document),
              component: InputSlide,
              props: ({ data }) => ({ ...data }),
            }),
          ]),
        ),
    }),
    Plugin.make,
  );

const meta = {
  title: 'plugins/plugin-presenter/components/Deck',
  render: DefaultStory,
  decorators: [
    withTheme(),
    withLayout({ layout: 'fullscreen' }),
    withClientProvider({ types: [Markdown.Document, Text.Text], createIdentity: true }),
  ],
  parameters: {
    layout: 'fullscreen',
    translations,
  },
} satisfies Meta<typeof DefaultStory>;

export default meta;

type Story = StoryObj<typeof meta>;

const withEmptyPlugins = withPluginManager({ plugins: [] });

export const Default: Story = {
  decorators: [withEmptyPlugins],
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    // The client identity is created before the first story renders, which can outlast the default timeout.
    const deck = await canvas.findByTestId('presenter.deck', undefined, { timeout: 10_000 });
    deck.focus();
    await userEvent.keyboard('{ArrowRight}{ArrowRight}');
    await expect(await canvas.findByText('3 / 5')).toBeVisible();
    await userEvent.keyboard('{Shift>}{ArrowLeft}{/Shift}');
    await expect(await canvas.findByText('1 / 5')).toBeVisible();
    await userEvent.keyboard('{End}');
    await expect(await canvas.findByText('5 / 5')).toBeVisible();
  },
};

export const Empty: Story = {
  decorators: [withEmptyPlugins],
  args: { count: 0 },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(await canvas.findByText('0 / 0')).toBeVisible();
    for (const label of ['Jump to first', 'Previous', 'Next', 'Jump to last']) {
      await expect(canvas.getByLabelText(label)).toBeDisabled();
    }
  },
};

export const EditableSlide: Story = {
  render: EditableStory,
  decorators: [withPluginManager({ plugins: [createInputPlugin()()] })],
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const input = await canvas.findByTestId('slide-input', undefined, { timeout: 10_000 });
    await userEvent.click(input);
    await userEvent.keyboard('{ArrowRight}');
    await new Promise((resolve) => setTimeout(resolve, 300));
    await expect(await canvas.findByText('1 / 2')).toBeVisible();
    await expect(canvas.queryByText('2 / 2')).toBeNull();

    for (const testId of ['slide-editable', 'slide-select', 'slide-slider']) {
      (await canvas.findByTestId(testId)).focus();
      await userEvent.keyboard('{ArrowRight}');
      await new Promise((resolve) => setTimeout(resolve, 300));
      await expect(canvas.queryByText('2 / 2')).toBeNull();
    }
  },
};

export const Fullscreen: Story = {
  decorators: [withEmptyPlugins],
  args: { fullscreen: true },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const overlay = await canvas.findByTestId('presenter.overlay');
    await expect(canvas.queryByTestId('presenter.play')).toBeNull();
    const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
    await sleep(1500);
    window.dispatchEvent(new PointerEvent('pointermove'));
    await sleep(1000);
    await expect(overlay).toHaveAttribute('data-visible', 'true');
    await waitFor(() => expect(overlay).toHaveAttribute('data-visible', 'false'), { timeout: 3_000 });
    window.dispatchEvent(new PointerEvent('pointermove'));
    await waitFor(() => expect(overlay).toHaveAttribute('data-visible', 'true'));
  },
};

/** The overlay pager stays while the pointer rests on it, and fades once the pointer leaves. */
export const FullscreenHover: Story = {
  decorators: [withEmptyPlugins],
  args: { fullscreen: true },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const overlay = await canvas.findByTestId('presenter.overlay');
    await userEvent.hover(overlay);
    // Longer than the idle time, after which an unhovered pager has faded.
    await new Promise((resolve) => setTimeout(resolve, 2_500));
    await expect(overlay).toHaveAttribute('data-visible', 'true');
    await userEvent.unhover(overlay);
    await waitFor(() => expect(overlay).toHaveAttribute('data-visible', 'false'), { timeout: 3_000 });
  },
};

export const FullscreenKey: Story = {
  decorators: [withEmptyPlugins],
  args: { onFullscreenChange: fn() },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    const deck = await canvas.findByTestId('presenter.deck');
    deck.focus();
    await userEvent.keyboard('f');
    await expect(await canvas.findByTestId('presenter.overlay')).toBeInTheDocument();
    await expect(args.onFullscreenChange).toHaveBeenCalledWith(true);
  },
};

/** After a click on the status-bar pager, `f` and the arrow keys still reach the deck. */
export const KeysAfterPagerClick: Story = {
  decorators: [withEmptyPlugins],
  args: { onFullscreenChange: fn() },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    await canvas.findByTestId('presenter.deck');
    const [next] = canvas.getAllByRole('button', { name: /next/i });
    await userEvent.click(next);
    await expect(await canvas.findByText('2 / 5')).toBeInTheDocument();
    await userEvent.keyboard('{ArrowRight}');
    await expect(await canvas.findByText('3 / 5')).toBeInTheDocument();
    await userEvent.keyboard('f');
    await expect(args.onFullscreenChange).toHaveBeenCalledWith(true);
  },
};

/** Shift or Caps Lock still toggles fullscreen. */
export const FullscreenShiftKey: Story = {
  decorators: [withEmptyPlugins],
  args: { onFullscreenChange: fn() },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    const deck = await canvas.findByTestId('presenter.deck');
    deck.focus();
    await userEvent.keyboard('F');
    await expect(args.onFullscreenChange).toHaveBeenCalledWith(true);
  },
};

export const StaleIndex: Story = {
  decorators: [withEmptyPlugins],
  render: StaleIndexStory,
  play: async ({ canvasElement }) => {
    await expect(await within(canvasElement).findByText('3 / 3')).toBeVisible();
  },
};

/** Click steps reveal items before the slide advances; going back lands on the previous slide fully revealed. */
export const ClickSteps: Story = {
  render: ClickStepsStory,
  decorators: [withEmptyPlugins],
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const deck = await canvas.findByTestId('presenter.deck');
    const hidden = () => canvasElement.querySelectorAll('li.invisible').length;
    await waitFor(() => expect(hidden()).toBe(3));
    deck.focus();
    for (const remaining of [2, 1, 0]) {
      await userEvent.keyboard('{ArrowRight}');
      await waitFor(() => expect(hidden()).toBe(remaining));
      await expect(canvas.getByText('1 / 2')).toBeVisible();
    }
    await userEvent.keyboard('{ArrowRight}');
    await expect(await canvas.findByText('2 / 2')).toBeVisible();
    await userEvent.keyboard('{ArrowLeft}');
    await expect(await canvas.findByText('1 / 2')).toBeVisible();
    await waitFor(() => expect(hidden()).toBe(0));
    await expect(canvasElement.querySelectorAll('li')).toHaveLength(3);
    await userEvent.keyboard('{End}{Home}{ArrowRight}');
    await waitFor(() => expect(hidden()).toBe(2));
    await expect(canvas.getByText('1 / 2')).toBeVisible();
  },
};

/** Advancing past the last slide keeps its revealed steps. */
export const ClickStepsAtEnd: Story = {
  render: ClickStepsLastStory,
  decorators: [withEmptyPlugins],
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const deck = await canvas.findByTestId('presenter.deck');
    const hidden = () => canvasElement.querySelectorAll('li.invisible').length;
    deck.focus();
    await userEvent.keyboard('{ArrowRight}');
    await expect(await canvas.findByText('2 / 2')).toBeVisible();
    await waitFor(() => expect(hidden()).toBe(3));
    for (const remaining of [2, 1, 0]) {
      await userEvent.keyboard('{ArrowRight}');
      await waitFor(() => expect(hidden()).toBe(remaining));
    }
    await userEvent.keyboard('{ArrowRight}');
    await expect(canvas.getByText('2 / 2')).toBeVisible();
    await expect(hidden()).toBe(0);
  },
};

/** Replacing the current slide's content in place starts it again at step 0. */
export const ClickStepsEdited: Story = {
  render: EditedSlideStory,
  decorators: [withEmptyPlugins],
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const deck = await canvas.findByTestId('presenter.deck');
    const hidden = () => canvasElement.querySelectorAll('li.invisible').length;
    await waitFor(() => expect(hidden()).toBe(3));
    deck.focus();
    await userEvent.keyboard('{ArrowRight}{ArrowRight}');
    await waitFor(() => expect(hidden()).toBe(1));
    await userEvent.click(canvas.getByTestId('replace-slide'));
    // The replaced slide remounts under a fresh frame, which shows once its size is measured.
    const after = await canvas.findByRole('heading', { name: 'After' });
    await waitFor(() => expect(after).toBeVisible());
    await waitFor(() => expect(hidden()).toBe(3));
  },
};

/** Leaving a slide through the pager drops its revealed steps, so coming back starts it at step 0. */
export const ClickStepsPager: Story = {
  render: ClickStepsStory,
  decorators: [withEmptyPlugins],
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const deck = await canvas.findByTestId('presenter.deck');
    const hidden = () => canvasElement.querySelectorAll('li.invisible').length;
    await waitFor(() => expect(hidden()).toBe(3));
    deck.focus();
    await userEvent.keyboard('{ArrowRight}{ArrowRight}');
    await waitFor(() => expect(hidden()).toBe(1));
    await userEvent.click(canvas.getByRole('button', { name: 'Next' }));
    await expect(await canvas.findByText('2 / 2')).toBeVisible();
    await userEvent.click(canvas.getByRole('button', { name: 'Previous' }));
    await expect(await canvas.findByText('1 / 2')).toBeVisible();
    await waitFor(() => expect(hidden()).toBe(3));
  },
};

/** Space activates a focused pager button natively and does not also advance the deck. */
export const SpaceOnButton: Story = {
  decorators: [withEmptyPlugins],
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await canvas.findByTestId('presenter.deck');
    const [next] = canvas.getAllByRole('button', { name: /next/i });
    next.focus();
    await userEvent.keyboard(' ');
    await expect(await canvas.findByText('2 / 5')).toBeVisible();
    await new Promise((resolve) => setTimeout(resolve, 200));
    await expect(canvas.queryByText('3 / 5')).toBeNull();
  },
};

/** Printing renders every slide, fully revealed, into a container scoped by an attribute that clears afterwards. */
export const Print: Story = {
  render: ClickStepsStory,
  decorators: [withEmptyPlugins],
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const deck = await canvas.findByTestId('presenter.deck');
    await waitFor(() => expect(canvasElement.querySelectorAll('li.invisible')).toHaveLength(3));
    await expect(document.querySelector('[data-print-deck]')).toBeNull();
    await expect(document.documentElement.hasAttribute('data-printing-deck')).toBe(false);

    deck.focus();
    window.dispatchEvent(new Event('beforeprint'));
    await waitFor(() => expect(document.querySelector('[data-print-deck]')).not.toBeNull());
    const container = document.querySelector('[data-print-deck]');
    if (!container) {
      throw new Error('print container missing');
    }
    await expect(document.documentElement.hasAttribute('data-printing-deck')).toBe(true);
    await waitFor(() => expect(container.querySelectorAll('[data-print-slide]')).toHaveLength(2));
    await waitFor(() => expect(container.querySelectorAll('li')).toHaveLength(3));
    await expect(container.querySelectorAll('.invisible')).toHaveLength(0);

    window.dispatchEvent(new Event('afterprint'));
    await waitFor(() => expect(document.querySelector('[data-print-deck]')).toBeNull());
    await expect(document.documentElement.hasAttribute('data-printing-deck')).toBe(false);
  },
};

/** A deck without focus does not claim a print. */
export const PrintUnfocused: Story = {
  render: ClickStepsStory,
  decorators: [withEmptyPlugins],
  play: async ({ canvasElement }) => {
    await within(canvasElement).findByTestId('presenter.deck');
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
    window.dispatchEvent(new Event('beforeprint'));
    await expect(document.querySelector('[data-print-deck]')).toBeNull();
    await expect(document.documentElement.hasAttribute('data-printing-deck')).toBe(false);
  },
};

/** The first slide's `theme: light` headmatter themes the whole deck. */
export const ThemeHeadmatter: Story = {
  render: () => <ThemedStory />,
  play: async ({ canvasElement }) => {
    await waitFor(() =>
      expect(canvasElement.querySelector<HTMLElement>('[data-slide]')?.style.colorScheme).toBe('light'),
    );
  },
};

/** A Presentation-style `theme` setting wins over headmatter. */
export const ThemeOverride: Story = {
  render: () => <ThemedStory theme={{ base: 'dark', accent: '#f97316' }} />,
  play: async ({ canvasElement }) => {
    await waitFor(() =>
      expect(canvasElement.querySelector<HTMLElement>('[data-slide]')?.style.colorScheme).toBe('dark'),
    );
  },
};
