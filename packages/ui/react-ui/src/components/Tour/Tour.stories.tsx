//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useMemo } from 'react';
import { expect, userEvent, waitFor, within } from 'storybook/test';

import { withLayout, withTheme } from '../../testing';
import { Button, IconButton } from '../Button';
import { Panel } from '../Panel';
import { Toolbar } from '../Toolbar';
import { Tour, type TourStepDetails, useTour } from './Tour.tsx';

const target = (selector: string) => () => document.querySelector<HTMLElement>(selector);

const steps: TourStepDetails[] = [
  {
    id: 'welcome',
    type: 'dialog',
    title: 'Welcome',
    description: 'A short tour of the toolbar. Arrow keys move between steps; Escape leaves.',
    actions: [
      { label: 'Skip', action: 'skip' },
      { label: 'Start', action: 'next' },
    ],
  },
  {
    id: 'add',
    type: 'tooltip',
    target: target('[data-testid="tour.add"]'),
    title: 'Add',
    description: 'Create something new.',
    placement: 'bottom-start',
    arrow: true,
    backdrop: true,
    actions: [
      { label: 'Back', action: 'prev' },
      { label: 'Next', action: 'next' },
    ],
  },
  {
    id: 'search',
    type: 'tooltip',
    target: target('[data-testid="tour.search"]'),
    title: 'Search',
    description: 'Find what you made.',
    placement: 'bottom',
    arrow: true,
    backdrop: true,
    actions: [
      { label: 'Back', action: 'prev' },
      { label: 'Next', action: 'next' },
    ],
  },
  {
    id: 'menu',
    type: 'tooltip',
    target: target('[data-testid="tour.menu"]'),
    title: 'Menu',
    description: 'Everything else lives here.',
    placement: 'bottom-end',
    arrow: true,
    backdrop: true,
    actions: [
      { label: 'Back', action: 'prev' },
      { label: 'Done', action: 'dismiss' },
    ],
  },
];

/** A toolbar with three targets and a button that starts the tour. */
const DefaultStory = () => {
  const tour = useTour({ steps: useMemo(() => steps, []) });
  return (
    <Panel.Root classNames='dx-base-surface'>
      <Panel.Toolbar asChild>
        <Toolbar.Root>
          <IconButton icon='ph--plus--regular' iconOnly label='Add' data-testid='tour.add' />
          <IconButton icon='ph--magnifying-glass--regular' iconOnly label='Search' data-testid='tour.search' />
          <Toolbar.Separator variant='gap' />
          <IconButton icon='ph--dots-three-vertical--regular' iconOnly label='Menu' data-testid='tour.menu' />
        </Toolbar.Root>
      </Panel.Toolbar>
      <Panel.Content classNames='grid place-items-center'>
        <Button onClick={() => tour.start()} data-testid='tour.start'>
          Start tour
        </Button>
      </Panel.Content>

      <Tour.Root tour={tour}>
        <Tour.Portal>
          <Tour.Backdrop />
          <Tour.Spotlight />
          <Tour.Positioner>
            <Tour.Content>
              <Tour.Arrow />
              <Tour.Title />
              <Tour.Description />
              <Tour.Control>
                <Tour.ProgressText />
                <div className='flex gap-1'>
                  <Tour.Actions>
                    {(actions) =>
                      actions.map((action) => (
                        <Tour.ActionTrigger key={action.label} action={action} asChild>
                          <Button variant={action.action === 'next' ? 'primary' : 'ghost'}>{action.label}</Button>
                        </Tour.ActionTrigger>
                      ))
                    }
                  </Tour.Actions>
                </div>
              </Tour.Control>
            </Tour.Content>
          </Tour.Positioner>
        </Tour.Portal>
      </Tour.Root>
    </Panel.Root>
  );
};

const meta = {
  title: 'ui/react-ui-core/components/Tour',
  render: DefaultStory,
  decorators: [withTheme(), withLayout({ layout: 'fullscreen' })],
  parameters: {
    layout: 'fullscreen',
  },
} satisfies Meta<typeof DefaultStory>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

const card = () => document.querySelector<HTMLElement>('[data-scope="tour"][data-part="content"]');

const shownCard = () => {
  const element = card();
  if (!element) {
    throw new Error('No tour card');
  }
  return element;
};

const stepOf = () => card()?.dataset.step;

/** Start, walk the steps, and finish: the card follows the steps and each target is highlighted. */
export const TestWalkthrough: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(card()).toBeNull();
    await userEvent.click(canvas.getByTestId('tour.start'));
    // The dialog step: centred, no target.
    await waitFor(() => expect(stepOf()).toBe('welcome'));
    await expect(card()).toHaveAttribute('role', 'alertdialog');
    await expect(card()).toHaveAttribute('data-type', 'dialog');
    await expect(within(shownCard()).getByText('Welcome')).toBeVisible();

    // The machine labels action triggers by their role ("next step"), so the button is found by its text.
    await userEvent.click(within(shownCard()).getByText('Start'));
    await waitFor(() => expect(stepOf()).toBe('add'));
    await expect(canvas.getByTestId('tour.add')).toHaveAttribute('data-tour-highlighted');
    await expect(card()).toHaveAttribute('data-type', 'tooltip');
    // Placed below its target.
    await waitFor(() => expect(card()).toHaveAttribute('data-side', 'bottom'));
    await waitFor(() =>
      expect(shownCard().getBoundingClientRect().top).toBeGreaterThan(
        canvas.getByTestId('tour.add').getBoundingClientRect().bottom,
      ),
    );
    await expect(within(shownCard()).getByText('2 of 4')).toBeVisible();

    // Keyboard navigation from the card.
    await userEvent.keyboard('{ArrowRight}');
    await waitFor(() => expect(stepOf()).toBe('search'));
    await expect(canvas.getByTestId('tour.add')).not.toHaveAttribute('data-tour-highlighted');
    await expect(canvas.getByTestId('tour.search')).toHaveAttribute('data-tour-highlighted');

    await userEvent.click(within(shownCard()).getByText('Next'));
    await waitFor(() => expect(stepOf()).toBe('menu'));
    await userEvent.click(within(shownCard()).getByText('Done'));
    await waitFor(() => expect(card()).toBeNull());
    await expect(canvas.getByTestId('tour.menu')).not.toHaveAttribute('data-tour-highlighted');
  },
};

/** Escape leaves the tour from any step. */
export const TestEscape: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByTestId('tour.start'));
    await waitFor(() => expect(stepOf()).toBe('welcome'));
    await userEvent.keyboard('{Escape}');
    await waitFor(() => expect(card()).toBeNull());
  },
};
