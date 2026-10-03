//
// Copyright 2026 DXOS.org
//

import '../../theme/index.css';

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useMemo } from 'react';
import { expect, userEvent, waitFor, within } from 'storybook/test';

import { translations } from '#translations';

import { withLayout, withTheme } from '../../../testing/index.ts';
import { byTestId } from '../../testing.ts';
import * as Button from '../Button/Button.tsx';
import * as Group from '../Group/Group.tsx';
import * as Tour from './Tour.tsx';

const target = (testId: string) => () => document.querySelector<HTMLElement>(`[data-testid="${testId}"]`);

const STEPS: Tour.StepDetails[] = [
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
    target: target('tour.add'),
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
    target: target('tour.search'),
    title: 'Search',
    description: 'Find what you made.',
    placement: 'bottom',
    arrow: true,
    backdrop: false,
    actions: [{ label: 'Back', action: 'prev' }],
  },
];

/** Three targets and a button that starts the tour; the last step ends with a Done button of its own. */
const DefaultStory = () => {
  const tour = Tour.useTour({ steps: useMemo(() => STEPS, []) });
  return (
    <>
      <Group.Group>
        <Button.Button icon='ph--plus--regular' iconOnly label='Add' data-testid='tour.add' />
        <Button.Button icon='ph--magnifying-glass--regular' iconOnly label='Search' data-testid='tour.search' />
        <Button.Button onClick={() => tour.start()} data-testid='tour.start'>
          Start tour
        </Button.Button>
      </Group.Group>
      <Tour.Root tour={tour}>
        <Tour.Content data-testid='tour.card'>
          <Tour.Header>
            <Tour.Title />
            <Tour.CloseTrigger />
          </Tour.Header>
          <Tour.Description />
          <Tour.Control>
            <Tour.ProgressText />
            <Group.Group>
              <Tour.Actions>
                {(actions) =>
                  actions.map((action) => (
                    <Tour.ActionTrigger
                      key={action.label}
                      action={action}
                      variant={action.action === 'next' ? 'primary' : 'ghost'}
                    />
                  ))
                }
              </Tour.Actions>
              {tour.lastStep && (
                <Tour.CloseTrigger asChild>
                  <Button.Button variant='primary'>Done</Button.Button>
                </Tour.CloseTrigger>
              )}
            </Group.Group>
          </Tour.Control>
        </Tour.Content>
      </Tour.Root>
    </>
  );
};

const meta = {
  title: 'ui/react-ui-core/components/Tour',
  render: DefaultStory,
  decorators: [withLayout({ classNames: 'p-4 w-[32rem]' }), withTheme()],
  parameters: { layout: 'centered', translations },
} satisfies Meta<typeof DefaultStory>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

const backdrop = () => document.querySelector<HTMLElement>('.dx-tour-backdrop');

/**
 * The tour opens on a centred `dialog` step: an `alertdialog` at `level='popup'` named by its title and described by
 * its description. Action triggers are named by their visible labels. A `tooltip` step highlights its target, places
 * the card below it with an arrow and, when the step asks, cuts it out of the backdrop. Arrow keys move between steps,
 * the header's close button and Escape end the tour, and the last step's own Done button (a `CloseTrigger asChild`)
 * keeps its name. The story ends open.
 */
export const Test: Story = {
  play: async ({ canvasElement }) => {
    const body = within(canvasElement.ownerDocument.body);
    const start = byTestId(canvasElement, 'tour.start');
    const add = byTestId(canvasElement, 'tour.add');

    await expect(body.queryByTestId('tour.card')).toBeNull();
    await userEvent.click(start);
    let card = await body.findByRole('alertdialog', { name: 'Welcome' });
    await expect(card).toHaveAccessibleDescription(/A short tour/);
    await expect(card).toHaveAttribute('data-type', 'dialog');
    await expect(card).toHaveAttribute('data-surface', 'popup');
    await expect(card).toHaveAttribute('data-size', 'md');
    await expect(getComputedStyle(card).getPropertyValue('--dx-level').trim()).toBe('5');
    await expect(card.querySelector('[data-part="arrow"]')).toBeNull();
    // Centred in the viewport.
    const rect = card.getBoundingClientRect();
    await expect(Math.abs(rect.left + rect.width / 2 - window.innerWidth / 2)).toBeLessThanOrEqual(1);
    await expect(within(card).getByRole('button', { name: 'Skip' })).toBeVisible();

    // A tooltip step, with an arrow and the target cut out of the backdrop.
    await userEvent.click(within(card).getByRole('button', { name: 'Start' }));
    card = await body.findByRole('alertdialog', { name: 'Add' });
    await waitFor(() => expect(add).toHaveAttribute('data-tour-highlighted'));
    await expect(card).toHaveAttribute('data-type', 'tooltip');
    await waitFor(() => expect(card.getBoundingClientRect().top).toBeGreaterThan(add.getBoundingClientRect().bottom));
    await waitFor(() => expect(card.querySelector('[data-part="arrow"]')).not.toBeNull());
    await expect(backdrop()).toBeVisible();
    await expect(within(card).getByText('2 of 3')).toBeVisible();
    const spotlight = document.querySelector<HTMLElement>('.dx-tour-spotlight');
    await waitFor(() =>
      expect(spotlight?.getBoundingClientRect().width).toBeCloseTo(add.getBoundingClientRect().width, 0),
    );

    // Keyboard navigation from the card; the last step opts out of the backdrop.
    card.focus();
    await userEvent.keyboard('{ArrowRight}');
    card = await body.findByRole('alertdialog', { name: 'Search' });
    await expect(add).not.toHaveAttribute('data-tour-highlighted');
    await expect(byTestId(canvasElement, 'tour.search')).toHaveAttribute('data-tour-highlighted');
    await waitFor(() => expect(backdrop()).not.toBeVisible());
    await userEvent.click(within(card).getByRole('button', { name: 'Done' }));
    await waitFor(() => expect(body.queryByTestId('tour.card')).toBeNull());

    // The header's close button, then Escape.
    await userEvent.click(start);
    card = await body.findByRole('alertdialog', { name: 'Welcome' });
    await userEvent.click(within(card).getByRole('button', { name: 'Close' }));
    await waitFor(() => expect(body.queryByTestId('tour.card')).toBeNull());
    await userEvent.click(start);
    await body.findByRole('alertdialog', { name: 'Welcome' });
    await userEvent.keyboard('{Escape}');
    await waitFor(() => expect(body.queryByTestId('tour.card')).toBeNull());

    await userEvent.click(start);
    await body.findByRole('alertdialog', { name: 'Welcome' });
  },
};
