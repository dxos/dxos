//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React from 'react';
import { expect, userEvent, waitFor, within } from 'storybook/test';

import { log } from '@dxos/log';
import '@dxos/react-ui/theme.css';
import * as Button from '@dxos/react-ui/Button';
import { withRegistry, withTheme } from '@dxos/react-ui/testing';
import { mx } from '@dxos/ui-theme';

import { translations } from '#translations';

import { MenuBuilder, TOOLBAR_OVERFLOW_ID } from '../builder.ts';
import { type ActionGraphProps, useMenuBuilder } from '../hooks/index.ts';
import { ActionMenu } from './ActionMenu.tsx';
import { ActionToolbar } from './ActionToolbar.tsx';

//
// Story fixtures: an owner's toolbar (a document editor) and the components that extend it.
//

type Log = (id: string) => void;

const record: Log = (id) => log.info('action', { id });

/** The owner declares named groups and the overflow menu; it knows nothing of its contributors. */
const ownerGraph = (log: Log): ActionGraphProps =>
  MenuBuilder.make()
    .group(
      'formatting',
      { label: 'Formatting', icon: 'ph--text-aa--regular', placement: { zone: 'start', collapse: 2 } },
      (group) =>
        group
          .action('heading', { label: 'Heading', icon: 'ph--text-h--regular', placement: { order: 10 } }, () =>
            log('heading'),
          )
          .action('bold', { label: 'Bold', icon: 'ph--text-b--regular', placement: { order: 20 } }, () => log('bold'))
          .action('italic', { label: 'Italic', icon: 'ph--text-italic--regular', placement: { order: 30 } }, () =>
            log('italic'),
          )
          .action('link', { label: 'Link', icon: 'ph--link--regular', placement: { order: 40 } }, () => log('link')),
    )
    .group(
      'blocks',
      { label: 'Blocks', icon: 'ph--list-bullets--regular', placement: { zone: 'start', collapse: 3 } },
      (group) =>
        group
          .action('list', { label: 'List', icon: 'ph--list-bullets--regular', placement: { order: 10 } }, () =>
            log('list'),
          )
          .action('quote', { label: 'Quote', icon: 'ph--quotes--regular', placement: { order: 20 } }, () =>
            log('quote'),
          ),
    )
    .group('view', { label: 'View', icon: 'ph--eye--regular', placement: { zone: 'end', collapse: 1 } }, (group) =>
      group.action('preview', { label: 'Preview', icon: 'ph--eye--regular' }, () => log('preview')),
    )
    .group('tools', { label: 'Tools', icon: 'ph--wrench--regular', placement: { zone: 'end' } }, (group) =>
      group.action('search', { label: 'Search', icon: 'ph--magnifying-glass--regular', placement: { order: 10 } }, () =>
        log('search'),
      ),
    )
    .menu(TOOLBAR_OVERFLOW_ID, (group) =>
      group.action('export', { label: 'Export', icon: 'ph--export--regular' }, () => log('export')),
    )
    .build();

type Contributor = 'review' | 'transcription' | 'presenter';

/** What other components add: each extends a named group, or adds its own group with a placement. */
const contributions: Record<Contributor, (log: Log) => ActionGraphProps[]> = {
  // Beside the formatting it relates to (after Link).
  review: (log) => [
    MenuBuilder.extend('formatting', (group) =>
      group.action(
        'comment',
        { label: 'Comment', icon: 'ph--chat-text--regular', testId: 'toolbar.comment', placement: { order: 45 } },
        () => log('comment'),
      ),
    ),
  ],
  // Ahead of Search in the owner's tools group.
  transcription: (log) => [
    MenuBuilder.extend('tools', (group) =>
      group.action(
        'microphone',
        { label: 'Dictate', icon: 'ph--microphone--regular', testId: 'toolbar.microphone', placement: { order: 5 } },
        () => log('microphone'),
      ),
    ),
  ],
  // Editing actions join the blocks group; slide-level controls take a second row; Print joins the overflow menu.
  presenter: (log) => [
    MenuBuilder.extend('blocks', (group) =>
      group
        .action(
          'column',
          {
            label: 'Start next column',
            icon: 'ph--columns--regular',
            testId: 'toolbar.column',
            placement: { order: 30 },
          },
          () => log('column'),
        )
        .action(
          'object',
          {
            label: 'Insert object',
            icon: 'ph--squares-four--regular',
            testId: 'toolbar.object',
            placement: { order: 40 },
          },
          () => log('object'),
        ),
    ),
    MenuBuilder.make()
      .group(
        'slide',
        { label: 'Slide', icon: 'ph--presentation--regular', placement: { row: 1, zone: 'start', collapse: 4 } },
        (group) =>
          group
            .action('layout', { label: 'Layout', icon: 'ph--layout--regular' }, () => log('layout'))
            .action('background', { label: 'Background', icon: 'ph--image--regular' }, () => log('background')),
      )
      .group(
        'deck',
        { label: 'Deck', icon: 'ph--projector-screen--regular', placement: { row: 1, zone: 'end' } },
        (group) => group.action('present', { label: 'Present', icon: 'ph--play--regular' }, () => log('present')),
      )
      .build(),
    MenuBuilder.extend(TOOLBAR_OVERFLOW_ID, (group) =>
      group.action('print', { label: 'Print', icon: 'ph--printer--regular' }, () => log('print')),
    ),
  ],
};

type StoryProps = { contributors?: Contributor[]; narrow?: boolean; asMenu?: boolean };

const DefaultStory = ({ contributors = [], narrow, asMenu }: StoryProps) => {
  const menu = useMenuBuilder(
    () =>
      contributors
        .flatMap((contributor) => contributions[contributor](record))
        .reduce((builder, graph) => builder.subgraph(graph), MenuBuilder.make().subgraph(ownerGraph(record)))
        .build(),
    [contributors],
  );

  return (
    <div className='p-8'>
      {asMenu ? (
        // The same graph as a menu: named groups become submenus, the overflow group one more.
        <ActionMenu {...menu}>
          <Button.Root data-testid='menu.trigger' icon='ph--list--regular' label='Menu' />
        </ActionMenu>
      ) : (
        // Fills the story frame; resize the window and groups move into ⋮ by collapse rank, coming back as it widens.
        <ActionToolbar
          {...menu}
          alwaysActive
          classNames={mx('border border-separator-subtle', narrow ? 'max-w-[20rem]' : undefined)}
        />
      )}
    </div>
  );
};

const meta = {
  title: 'ui/react-ui-menu/ToolbarLayout',
  render: DefaultStory,
  decorators: [withTheme(), withRegistry],
  parameters: { translations },
} satisfies Meta<typeof DefaultStory>;

export default meta;

type Story = StoryObj<typeof meta>;

/** The labels of a row's buttons, in DOM order. */
const labels = (canvasElement: HTMLElement, row = 0) => {
  const rows = canvasElement.querySelectorAll<HTMLElement>('[role=toolbar]');
  return [...(rows[row]?.querySelectorAll('button') ?? [])].map((button) => button.getAttribute('aria-label'));
};

/** The owner's named groups across the start and end zones, with Export in the overflow menu. */
export const Groups: Story = {
  play: async ({ canvasElement }) => {
    await waitFor(() =>
      expect(labels(canvasElement)).toEqual([
        'Heading',
        'Bold',
        'Italic',
        'Link',
        'List',
        'Quote',
        'Preview',
        'Search',
        'More',
      ]),
    );
    await userEvent.click(within(canvasElement).getByTestId('toolbar.overflow'));
    await expect(await within(document.body).findByRole('menuitem', { name: 'Export' })).toBeVisible();
  },
};

/** Other components extend the owner's named groups (interleaved by order), add a second row, and extend ⋮. */
export const Extended: Story = {
  args: { contributors: ['review', 'transcription', 'presenter'] },
  play: async ({ canvasElement }) => {
    await waitFor(() =>
      expect(labels(canvasElement)).toEqual([
        'Heading',
        'Bold',
        'Italic',
        'Link',
        'Comment',
        'List',
        'Quote',
        'Start next column',
        'Insert object',
        'Preview',
        'Dictate',
        'Search',
        'More',
      ]),
    );
    await expect(labels(canvasElement, 1)).toEqual(['Layout', 'Background', 'Present']);
    await userEvent.click(within(canvasElement).getByTestId('toolbar.overflow'));
    await expect(await within(document.body).findByRole('menuitem', { name: 'Print' })).toBeVisible();
  },
};

/** At a narrow width whole groups move into ⋮ by collapse rank, each as a submenu; unranked groups stay. */
export const Narrow: Story = {
  args: { contributors: ['review', 'transcription', 'presenter'], narrow: true },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await waitFor(() => expect(labels(canvasElement)).not.toContain('List'));
    await expect(canvas.getByTestId('toolbar.microphone')).toBeVisible();
    await userEvent.click(canvas.getByTestId('toolbar.overflow'));
    const body = within(document.body);
    await userEvent.click(await body.findByRole('menuitem', { name: 'Blocks' }));
    await expect(await body.findByRole('menuitem', { name: 'Insert object' })).toBeVisible();
  },
};

/** The same graph rendered as a menu: named groups are submenus. */
export const AsMenu: Story = {
  args: { contributors: ['review'], asMenu: true },
  play: async ({ canvasElement }) => {
    await userEvent.click(within(canvasElement).getByTestId('menu.trigger'));
    const body = within(document.body);
    await userEvent.click(await body.findByRole('menuitem', { name: 'Formatting' }));
    await expect(await body.findByRole('menuitem', { name: 'Comment' })).toBeVisible();
  },
};
