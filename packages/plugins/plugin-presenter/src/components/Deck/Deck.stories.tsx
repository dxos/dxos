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

/** The thumbnail grid as `PresentationArticle` composes it, over a first slide with click steps. */
const GridStory = () => {
  const slides = useMemo(() => [...createClickSlides(), ...createTextSlides(8)], []);
  const [index, setIndex] = useState(0);
  const [fullscreen, setFullscreen] = useState(false);
  return (
    <Deck.Root
      slides={slides}
      index={index}
      onIndexChange={setIndex}
      fullscreen={fullscreen}
      onFullscreenChange={setFullscreen}
    >
      <Panel.Root asChild>
        <Deck.Content>
          <Panel.Body asChild>{fullscreen ? <Deck.Viewport /> : <Deck.Grid />}</Panel.Body>
        </Deck.Content>
      </Panel.Root>
    </Deck.Root>
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

/** A deck's footer: a line of text at the start edge, and the slide's number over the deck's count at the end. */
const FOOTER = { left: 'DXOS', right: '<SlideCurrentNo /> / <SlidesTotal />' };

/** A cover, a plain slide, a slide that switches the footer off, a slide the deck hides, and a last one. */
const FOOTER_SLIDES = [
  ['---', 'layout: cover', '---', '', '# Composer'].join('\n'),
  ['# Agenda', '', '- Memory', '- Access', '- Coordination'].join('\n'),
  ['---', 'footer: false', '---', '', '# A slide with no footer'].join('\n'),
  '# Left out when presented',
  '# Thank you',
];

/** The positions the deck presents: every slide but the fourth. */
const FOOTER_PRESENTED = [0, 1, 2, 4];

/** A deck with a footer, as the viewport draws it (one slide) or as the grid does (every slide, the hidden one too). */
const FooterStory = ({ grid = false }: { grid?: boolean }) => {
  const slides = useMemo(
    (): SlideSource[] => FOOTER_SLIDES.map((content, index) => ({ kind: 'markdown', id: `footer-${index}`, content })),
    [],
  );
  const [index, setIndex] = useState(1);
  const props = { slides, index, onIndexChange: setIndex, footer: FOOTER, presented: FOOTER_PRESENTED };
  if (!grid) {
    return <DeckPanel {...props} />;
  }
  return (
    <Deck.Root {...props}>
      <Panel.Root asChild>
        <Deck.Content>
          <Panel.Body asChild>
            <Deck.Grid size='large' />
          </Panel.Body>
        </Deck.Content>
      </Panel.Root>
    </Deck.Root>
  );
};

/** Linked objects as slides, which no markdown draws: the deck's footer is on them all the same. */
const FooterObjectStory = () => {
  const slides = useMemo(
    (): SlideSource[] =>
      [0, 1].map((index) => ({
        kind: 'object' as const,
        id: `object-${index}`,
        object: Markdown.make({ name: `Doc ${index}`, content: '# Linked' }),
      })),
    [],
  );
  const [index, setIndex] = useState(0);
  return <DeckPanel slides={slides} index={index} onIndexChange={setIndex} footer={FOOTER} />;
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

/** A slide stays on screen through every slide change; no commit leaves the frame empty, which would flash. */
export const SlideChangeKeepsFrame: Story = {
  decorators: [withEmptyPlugins],
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const deck = await canvas.findByTestId('presenter.deck', undefined, { timeout: 10_000 });
    await waitFor(() => expect(deck.querySelector('[data-slide]')).not.toBeNull());
    let emptyCommits = 0;
    const observer = new MutationObserver(() => {
      if (!deck.querySelector('[data-slide]')) {
        emptyCommits++;
      }
    });
    observer.observe(deck, { childList: true, subtree: true });
    deck.focus();
    for (const [key, page] of [
      ['{ArrowRight}', '2 / 5'],
      ['{ArrowRight}', '3 / 5'],
      ['{ArrowLeft}', '2 / 5'],
    ] as const) {
      await userEvent.keyboard(key);
      await expect(await canvas.findByText(page)).toBeVisible();
    }
    observer.disconnect();
    await expect(emptyCommits).toBe(0);
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

/** Up and down reveal items before the slide advances; going back lands on the previous slide fully revealed. */
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
      await userEvent.keyboard('{ArrowDown}');
      await waitFor(() => expect(hidden()).toBe(remaining));
      await expect(canvas.getByText('1 / 2')).toBeVisible();
    }
    await userEvent.keyboard('{ArrowDown}');
    await expect(await canvas.findByText('2 / 2')).toBeVisible();
    await userEvent.keyboard('{ArrowUp}');
    await expect(await canvas.findByText('1 / 2')).toBeVisible();
    await waitFor(() => expect(hidden()).toBe(0));
    await expect(canvasElement.querySelectorAll('li')).toHaveLength(3);
    await userEvent.keyboard('{End}{Home}{ArrowDown}');
    await waitFor(() => expect(hidden()).toBe(2));
    await expect(canvas.getByText('1 / 2')).toBeVisible();
  },
};

/** The columns the grid laid out, read as a row move does; a tile grid measures itself a frame after it mounts. */
const gridColumns = (canvasElement: HTMLElement) =>
  waitFor(async () => {
    const tiles = Array.from(canvasElement.querySelectorAll<HTMLElement>('[role="option"]'));
    const columns = tiles.filter((tile) => tile.offsetTop === tiles[0].offsetTop).length;
    await expect(columns).toBeGreaterThan(1);
    return columns;
  });

const expectSelected = (canvas: ReturnType<typeof within>, index: number) =>
  waitFor(() =>
    expect(canvas.getByTestId(`presenter.slide-gallery.${index}`)).toHaveAttribute('aria-selected', 'true'),
  );

/** In the grid Up and Down move between rows and stop at the first and last, and the keys survive presenting. */
export const GridKeys: Story = {
  render: GridStory,
  decorators: [withEmptyPlugins],
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const deck = await canvas.findByTestId('presenter.deck');
    await canvas.findByTestId('presenter.slide-gallery.9');
    const columns = await gridColumns(canvasElement);
    deck.focus();
    await expectSelected(canvas, 0);
    await userEvent.keyboard('{ArrowUp}');
    await expectSelected(canvas, 0);
    await userEvent.keyboard('{ArrowDown}');
    await expectSelected(canvas, columns);
    await userEvent.keyboard('{ArrowUp}');
    await expectSelected(canvas, 0);
    await userEvent.keyboard('{End}{ArrowDown}');
    await expectSelected(canvas, 9);
    await userEvent.keyboard('{Home}');
    await expectSelected(canvas, 0);
    await userEvent.keyboard(' ');
    await expect(await canvas.findByTestId('presenter.overlay')).toBeInTheDocument();
    await userEvent.keyboard('{Escape}');
    await waitFor(() => expect(canvas.getByTestId('presenter.deck')).toHaveFocus());
    const columnsAfterExit = await gridColumns(canvasElement);
    await userEvent.keyboard('{ArrowDown}');
    await expectSelected(canvas, columnsAfterExit);
  },
};

/** With a clicked thumbnail holding focus, every key moves the one current tile, and no other tile stays marked. */
export const GridKeysOnTile: Story = {
  render: GridStory,
  decorators: [withEmptyPlugins],
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(await canvas.findByTestId('presenter.slide-gallery.0'));
    await canvas.findByTestId('presenter.slide-gallery.9');
    const columns = await gridColumns(canvasElement);
    await expectSelected(canvas, 0);
    await userEvent.keyboard('{ArrowDown}');
    await expectSelected(canvas, columns);
    await userEvent.keyboard('{ArrowUp}');
    await expectSelected(canvas, 0);
    await userEvent.keyboard('{ArrowRight}');
    await expectSelected(canvas, 1);
    await expect(canvasElement.querySelectorAll('[data-highlighted]:not([aria-selected="true"])')).toHaveLength(0);
    await userEvent.keyboard('{ArrowLeft}');
    await expectSelected(canvas, 0);
    await userEvent.keyboard(']');
    await expectSelected(canvas, 1);
    await userEvent.keyboard('[[');
    await expectSelected(canvas, 0);
  },
};

/** Space on a clicked thumbnail presents from it, rather than the listbox selecting it again. */
export const GridSpaceOnTile: Story = {
  render: GridStory,
  decorators: [withEmptyPlugins],
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(await canvas.findByTestId('presenter.slide-gallery.1'));
    await waitFor(() =>
      expect(canvas.getByTestId('presenter.slide-gallery.1')).toHaveAttribute('aria-selected', 'true'),
    );
    await userEvent.keyboard(' ');
    await expect(await canvas.findByRole('heading', { name: 'Plain' })).toBeInTheDocument();
    await expect(canvas.queryByTestId('presenter.slide-gallery.1')).toBeNull();
  },
};

/** Left, right and the brackets move whole slides past any build, landing fully built; Cmd or Ctrl with left or right jumps to the deck's ends. */
export const SlideKeys: Story = {
  render: ClickStepsStory,
  decorators: [withEmptyPlugins],
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const deck = await canvas.findByTestId('presenter.deck');
    const hidden = () => canvasElement.querySelectorAll('li.invisible').length;
    await waitFor(() => expect(hidden()).toBe(3));
    deck.focus();
    for (const [key, page] of [
      ['{ArrowRight}', '2 / 2'],
      ['{ArrowLeft}', '1 / 2'],
      [']', '2 / 2'],
      // A doubled bracket is a literal `[` in userEvent's key syntax.
      ['[[', '1 / 2'],
    ] as const) {
      await userEvent.keyboard(key);
      await expect(await canvas.findByText(page)).toBeVisible();
    }
    // Back through the slide keys lands on the slide fully revealed, as left does.
    await waitFor(() => expect(hidden()).toBe(0));

    await userEvent.keyboard('{Meta>}{ArrowRight}{/Meta}');
    await expect(await canvas.findByText('2 / 2')).toBeVisible();
    await userEvent.keyboard('{Control>}{ArrowLeft}{/Control}');
    await expect(await canvas.findByText('1 / 2')).toBeVisible();
    await waitFor(() => expect(hidden()).toBe(3));

    // Cmd with any other key stays with the browser.
    await userEvent.keyboard('{Meta>}]{/Meta}');
    await expect(canvas.getByText('1 / 2')).toBeVisible();
  },
};

/** The slide keys stop at the deck's ends without dropping what is revealed there. */
export const SlideKeysAtEnd: Story = {
  render: ClickStepsLastStory,
  decorators: [withEmptyPlugins],
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const deck = await canvas.findByTestId('presenter.deck');
    const hidden = () => canvasElement.querySelectorAll('li.invisible').length;
    // The list mounts after the page number, so a count of hidden items waits for the items.
    const built = () =>
      waitFor(async () => {
        await expect(canvasElement.querySelectorAll('li')).toHaveLength(3);
        await expect(hidden()).toBe(0);
      });
    deck.focus();
    await userEvent.keyboard('{ArrowRight}');
    await expect(await canvas.findByText('2 / 2')).toBeVisible();
    await built();
    await userEvent.keyboard('{ArrowUp}');
    await waitFor(() => expect(hidden()).toBe(1));
    await userEvent.keyboard('{ArrowRight}');
    await expect(canvas.getByText('2 / 2')).toBeVisible();
    await expect(hidden()).toBe(1);

    // Left and right, like the brackets, land on a slide fully built.
    await userEvent.keyboard('[[');
    await expect(await canvas.findByText('1 / 2')).toBeVisible();
    await userEvent.keyboard(']');
    await expect(await canvas.findByText('2 / 2')).toBeVisible();
    await built();
    await userEvent.keyboard('{ArrowUp}{ArrowLeft}');
    await expect(await canvas.findByText('1 / 2')).toBeVisible();
    await userEvent.keyboard('{ArrowRight}');
    await expect(await canvas.findByText('2 / 2')).toBeVisible();
    await built();
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
    await userEvent.keyboard('{ArrowDown}');
    await expect(await canvas.findByText('2 / 2')).toBeVisible();
    await waitFor(() => expect(hidden()).toBe(3));
    for (const remaining of [2, 1, 0]) {
      await userEvent.keyboard('{ArrowDown}');
      await waitFor(() => expect(hidden()).toBe(remaining));
    }
    await userEvent.keyboard('{ArrowDown}');
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
    await userEvent.keyboard('{ArrowDown}{ArrowDown}');
    await waitFor(() => expect(hidden()).toBe(1));
    await userEvent.click(canvas.getByTestId('replace-slide'));
    // The replaced slide remounts inside the frame and shows once its content has rendered.
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
    await userEvent.keyboard('{ArrowDown}{ArrowDown}');
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

/** The element a selector finds under `container`; the story fails by name where there is none. */
const find = (container: Element, selector: string): HTMLElement => {
  const element = container.querySelector<HTMLElement>(selector);
  if (!element) {
    throw new Error(`No element for ${selector}`);
  }
  return element;
};

/** The text of a footer's part, or undefined where no footer is drawn. */
const footerPart = (container: Element, part: 'left' | 'center' | 'right') =>
  container.querySelector(`[data-slide-footer] [data-part="${part}"]`)?.textContent;

/**
 * A deck's footer is drawn on the slide's own canvas, over its bottom padding: the text the deck sets and the slide's
 * number, on every slide but a cover and one that says `footer: false`.
 */
export const Footer: Story = {
  render: () => <FooterStory />,
  decorators: [withEmptyPlugins],
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const deck = await canvas.findByTestId('presenter.deck', undefined, { timeout: 10_000 });
    const footer = await waitFor(() => find(deck, '[data-slide-footer]'));

    // 1. The second of the four slides the deck presents: its text at the start edge, its number at the end.
    await expect(footerPart(deck, 'left')).toBe('DXOS');
    await expect(footerPart(deck, 'right')).toBe('2 / 4');

    // 2. An overlay inside the slide's bottom padding: the slide's layout still covers the whole slide, and the
    // footer stands on its bottom edge, no taller than the padding (64 of the canvas's 1440).
    const slide = find(deck, '[data-slide]');
    const layout = find(slide, '[data-layout]');
    const box = slide.getBoundingClientRect();
    const scale = box.height / 1440;
    await expect(layout.getBoundingClientRect().height).toBeCloseTo(box.height, 0);
    await expect(footer.getBoundingClientRect().bottom).toBeCloseTo(box.bottom, 0);
    await expect(footer.getBoundingClientRect().height).toBeCloseTo(64 * scale, 0);
    await expect(getComputedStyle(layout).paddingBottom).toBe('64px');
    // The slide's content ends above it.
    const lastLine = find(slide, 'li:last-of-type');
    await expect(lastLine.getBoundingClientRect().bottom).toBeLessThan(footer.getBoundingClientRect().top);

    // 3. Quiet type in the slide's own color and font, with digits of one width.
    await expect(getComputedStyle(footer).fontSize).toBe('28px');
    await expect(getComputedStyle(footer).color).toBe(getComputedStyle(slide).color);
    await expect(getComputedStyle(footer).fontFamily).toBe(getComputedStyle(slide).fontFamily);
    await expect(Number(getComputedStyle(footer).opacity)).toBeLessThan(1);
    const number = find(footer, '[data-slide-counter="current"]');
    await expect(getComputedStyle(number).fontVariantNumeric).toBe('tabular-nums');

    // 4. The next slide says `footer: false`, and the cover shows none of its own accord.
    deck.focus();
    await userEvent.keyboard('{ArrowRight}');
    await canvas.findByText('A slide with no footer');
    await expect(deck.querySelector('[data-slide-footer]')).toBeNull();
    await userEvent.keyboard('{Home}');
    await canvas.findByText('Composer');
    await expect(deck.querySelector('[data-slide-footer]')).toBeNull();

    // 5. The last slide is the fourth the deck presents, though it is the fifth in the grid.
    await userEvent.keyboard('{End}');
    await canvas.findByText('Thank you');
    await waitFor(() => expect(footerPart(deck, 'right')).toBe('4 / 4'));
  },
};

/**
 * Every thumbnail carries its slide's footer, numbered as the presentation will be: the slide the deck leaves out
 * has no number, and the slides after it close the gap.
 */
export const FooterGrid: Story = {
  render: () => <FooterStory grid />,
  decorators: [withEmptyPlugins],
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const tiles = await Promise.all(
      FOOTER_SLIDES.map((_, index) =>
        canvas.findByTestId(`presenter.slide-gallery.${index}`, undefined, { timeout: 10_000 }),
      ),
    );
    await waitFor(() => expect(footerPart(tiles[4], 'right')).toBe('4 / 4'));
    await expect(tiles.map((tile) => footerPart(tile, 'right'))).toEqual([
      undefined,
      '2 / 4',
      undefined,
      '\u2013 / 4',
      '4 / 4',
    ]);
    await expect(footerPart(tiles[1], 'left')).toBe('DXOS');
    // The footer is part of the picture: it scales with its thumbnail, on the slide's bottom edge.
    const slide = find(tiles[1], '[data-slide]').getBoundingClientRect();
    const footer = find(tiles[1], '[data-slide-footer]').getBoundingClientRect();
    await expect(footer.bottom).toBeCloseTo(slide.bottom, 0);
    await expect(footer.height).toBeCloseTo((64 * slide.height) / 1440, 0);
  },
};

/** A linked object's slide is drawn by its own surface, and the deck still puts its footer on it. */
export const FooterObject: Story = {
  render: FooterObjectStory,
  decorators: [withPluginManager({ plugins: [createInputPlugin()()] })],
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const deck = await canvas.findByTestId('presenter.deck', undefined, { timeout: 10_000 });
    await canvas.findByTestId('slide-input');
    await waitFor(() => expect(footerPart(deck, 'right')).toBe('1 / 2'));
    await expect(footerPart(deck, 'left')).toBe('DXOS');
    await expect(deck.querySelector('[data-slide]')).toBeNull();
  },
};

/** A printed deck is one page per slide, each with its footer and its own number. */
export const FooterPrint: Story = {
  render: () => <FooterStory />,
  decorators: [withEmptyPlugins],
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const deck = await canvas.findByTestId('presenter.deck', undefined, { timeout: 10_000 });
    deck.focus();
    window.dispatchEvent(new Event('beforeprint'));
    await waitFor(() => expect(document.querySelectorAll('[data-print-deck] [data-print-slide]')).toHaveLength(5));
    const pages = [...document.querySelectorAll('[data-print-deck] [data-print-slide]')];
    await waitFor(() => expect(footerPart(pages[4], 'right')).toBe('4 / 4'));
    await expect(pages.map((page) => footerPart(page, 'right'))).toEqual([
      undefined,
      '2 / 4',
      undefined,
      '\u2013 / 4',
      '4 / 4',
    ]);
    window.dispatchEvent(new Event('afterprint'));
    await waitFor(() => expect(document.querySelector('[data-print-deck]')).toBeNull());
  },
};
