//
// Copyright 2025 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React from 'react';
import { expect, within } from 'storybook/test';

import { Card, Field, ScrollArea, ScrollAreaRootProps, Toolbar } from '../../components/index.ts';
import { withLayout, withTheme } from '../../testing/index.ts';
import { composable, composableProps } from '../../util/index.ts';
import { Panel, type PanelRootProps } from './Panel.tsx';

const List = composable<HTMLDivElement, ScrollAreaRootProps>((props, forwardedRef) => {
  return (
    <ScrollArea.Root centered {...composableProps(props, { role: 'list' })} ref={forwardedRef}>
      <ScrollArea.Viewport>
        {Array.from({ length: 100 }).map((_, i) => (
          <div key={i} role='listitem' className='p-1 hover:bg-hover-surface'>
            Item {i}
          </div>
        ))}
      </ScrollArea.Viewport>
    </ScrollArea.Root>
  );
});

/**
 * Panel is the standard full-height surface layout: a CSS grid whose `auto 1fr auto`
 * rows pin a toolbar and statusbar while the content region absorbs the remaining
 * height, so a scroll container inside it scrolls rather than growing the page. Each
 * region takes `asChild` to merge its grid slot onto a `Toolbar.Root` / `ScrollArea`
 * instead of nesting an extra wrapper element.
 *
 * @idiom org.dxos.react-ui.panelLayout
 *   applies: Any full-height pane with a fixed toolbar/statusbar and a scrolling body
 *   instead-of: Hand-wiring flex columns with min-height:0 and a bespoke scroll container
 *   uses: {@link Panel.Root}, {@link Panel.Toolbar}, {@link Panel.Content}, {@link Panel.Statusbar}
 *   related: org.dxos.react-ui-menu.toolbarMenu
 */
type StoryArgs = Pick<PanelRootProps, 'as' | 'elevation'> & {
  /** The toolbar's and status bar's own level, over the panel's. */
  barElevation?: PanelRootProps['elevation'];
};

const DefaultStory = ({ as, elevation, barElevation }: StoryArgs) => {
  return (
    <Panel.Root as={as} elevation={elevation} classNames='dx-document'>
      <Panel.Toolbar asChild elevation={barElevation}>
        <Toolbar.Root>
          <Toolbar.IconButton icon='ph--plus--regular' variant='primary' label='Add' />
          <Field.Root>
            <Field.Input placeholder='Search' />
          </Field.Root>
          <Toolbar.IconButton icon='ph--dots-three-vertical--regular' iconOnly label='Menu' />
        </Toolbar.Root>
      </Panel.Toolbar>

      <Panel.Content asChild>
        <List />
      </Panel.Content>

      <Panel.Statusbar asChild elevation={barElevation}>
        <Toolbar.Root classNames='justify-between'>
          <Toolbar.IconButton variant='ghost' icon='ph--house--regular' iconOnly label='Add' />
          <Toolbar.IconButton variant='ghost' icon='ph--alarm--regular' iconOnly label='Status' />
        </Toolbar.Root>
      </Panel.Statusbar>
    </Panel.Root>
  );
};

const meta = {
  title: 'ui/react-ui-core/components/Panel',
  render: DefaultStory,
  argTypes: {
    as: { control: 'select', options: ['div', 'main', 'section', 'article', 'aside', 'nav'] },
    elevation: { control: 'select', options: [undefined, 0, 1, 2, 3, 4, 5] },
    barElevation: { control: 'select', options: [undefined, 0, 1, 2, 3, 4, 5] },
  },
  decorators: [withTheme(), withLayout({ layout: 'fullscreen' })],
  parameters: {
    layout: 'fullscreen',
  },
} satisfies Meta<typeof DefaultStory>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

const LEVELS = [0, 1, 2, 3, 4, 5] as const;

/**
 * The ladder: one panel per elevation, each with a toolbar that inherits the level (a bar aspect
 * off it) and a card inside that keeps its own `raised` level. Levels 3–5 cast a shadow.
 */
const ElevationStory = () => (
  <div className='grid grid-cols-3 gap-4 p-4 dx-fill dx-deck-surface'>
    {LEVELS.map((elevation) => (
      <Panel.Root key={elevation} elevation={elevation} classNames='rounded-md'>
        <Panel.Toolbar asChild>
          <Toolbar.Root>
            <Toolbar.Text>{`elevation={${elevation}}`}</Toolbar.Text>
            <Toolbar.IconButton icon='ph--dots-three-vertical--regular' iconOnly label='Menu' />
          </Toolbar.Root>
        </Panel.Toolbar>
        <Panel.Content classNames='p-4'>
          <Card.Root fullWidth>
            <Card.Header>
              <Card.Title>Card on the panel</Card.Title>
            </Card.Header>
          </Card.Root>
        </Panel.Content>
        <Panel.Statusbar asChild>
          <Toolbar.Root>
            <Toolbar.Text>Status</Toolbar.Text>
          </Toolbar.Root>
        </Panel.Statusbar>
      </Panel.Root>
    ))}
  </div>
);

export const Elevation: Story = {
  render: () => <ElevationStory />,
};

/** Each elevation enters its surface and paints a distinct, monotonic tone; the bars follow their host. */
export const TestElevation: Story = {
  render: () => <ElevationStory />,
  play: async ({ canvasElement }) => {
    const panels = [...canvasElement.querySelectorAll<HTMLElement>('[data-surface]')].filter((element) =>
      element.parentElement?.classList.contains('dx-deck-surface'),
    );
    await expect(panels).toHaveLength(LEVELS.length);
    await expect(panels.map((panel) => panel.dataset.surface)).toEqual([
      'sunken',
      'chrome',
      'base',
      'raised',
      'overlay',
      'popup',
    ]);
    const lightness = (element: Element) => {
      const [red, green, blue] =
        getComputedStyle(element)
          .backgroundColor.match(/[\d.]+/g)
          ?.map(Number) ?? [];
      return red + green + blue;
    };
    const tones = panels.map(lightness);
    await expect(new Set(tones).size).toBe(LEVELS.length);
    // The ladder is monotonic in one direction, whichever theme the story runs in.
    const ascending = tones.every((tone, index) => index === 0 || tone > tones[index - 1]);
    const descending = tones.every((tone, index) => index === 0 || tone < tones[index - 1]);
    await expect(ascending || descending).toBe(true);
    // Above the canvas the level casts a shadow; on the chrome levels it does not.
    const shadowed = panels.map((panel) => getComputedStyle(panel).boxShadow !== 'none');
    await expect(shadowed).toEqual([false, false, false, true, true, true]);
    // A toolbar with its own elevation paints it even inside a Panel slot.
    const bar = panels[2].querySelector<HTMLElement>('[data-slot="toolbar"]');
    await expect(bar?.dataset.surface).toBeUndefined();
  },
};

/** `as='main'` renders the landmark itself, with its own role rather than `none`. */
export const TestLandmark: Story = {
  args: { as: 'main' },
  play: async ({ canvasElement }) => {
    const main = within(canvasElement).getByRole('main');
    await expect(main.tagName).toBe('MAIN');
    await expect(main).not.toHaveAttribute('role');
  },
};
