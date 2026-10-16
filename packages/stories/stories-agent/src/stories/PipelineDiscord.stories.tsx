//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React from 'react';
import { expect, userEvent, waitFor, within } from 'storybook/test';

import { translations as debugTranslations } from '@dxos/react-ui-debug/translations';
import * as Panel from '@dxos/react-ui/Panel';

import { StoryRole, StorySettingsToolbar } from '../modules/index.ts';
import {
  type FakeCrawl,
  ModuleContainer,
  type ModuleLayout,
  createDecorators,
  edgeFake,
  installFakeCrawl,
  setupAgent,
  setupDiscordAgent,
  storyConfig,
  storyParameters,
} from '../testing/index.ts';

type StoryArgs = {
  layout?: ModuleLayout;
  /** Keeps the profile (space, bindings, fact feed) across reloads; a change reboots the story. */
  persistent?: boolean;
};

const meta: Meta<StoryArgs> = {
  title: 'stories/stories-agent/PipelineDiscord',
  render: ModuleContainer,
  // The pipeline's timeline renders `@dxos/react-ui-debug`'s Logger, so its namespace must be registered.
  parameters: { ...storyParameters, translations: [...storyParameters.translations, ...debugTranslations] },
};

export default meta;

const companion = (variant: string) => ({
  type: StoryRole.AgentCompanion,
  data: { variant },
  id: `companion-${variant}`,
});

type Story = StoryObj<StoryArgs>;

/**
 * The Discord back-index on EDGE against a real Discord server: the agent's brain crawls the bound channels' history
 * with `@dxos/crawler` and extracts facts from it. Needs an EDGE with the crawl routes (the edge branch
 * `dm/elegant-euler-at56gd`, local or deployed) and the Discord setup in the package README.
 *
 * Try:
 * 1. Discord: **Connect Discord**, **Install** Kai in a server, **Refresh**, pick the server and **Connect** a channel.
 * 2. Discord pipeline: the channel appears under Channels, checked; set **Max days** (e.g. 30) and pick or create a
 *    **Fact feed**.
 * 3. **Start**: the run status goes running, targets appear (the channel, then its threads), and the counters climb.
 * 4. The timeline records each step; the brain companion lists the facts as they are extracted.
 * 5. **Pause**, then **Resume**: the crawl continues from each target's cursor.
 * 6. A row's reset button re-reads that channel or thread from the start; **Reset all** re-reads everything.
 * 7. Reload: the space keeps the binding and the feed, and EDGE keeps the crawl's config and cursors.
 */
export const Setup: Story = {
  render: (args) => (
    <Panel.Root>
      <Panel.Header>
        <StorySettingsToolbar />
      </Panel.Header>
      {/* `ModuleContainer` pins itself to its nearest positioned ancestor, so the body is that ancestor. */}
      <Panel.Body classNames='relative'>
        <ModuleContainer {...args} />
      </Panel.Body>
    </Panel.Root>
  ),
  decorators: createDecorators<StoryArgs>(({ args }) => ({
    config: storyConfig({ persistent: args.persistent }),
    onReady: async ({ db, invoker }) => {
      await setupAgent({ db, invoker, remote: true });
    },
  })),
  argTypes: { persistent: { control: 'boolean' } },
  args: {
    persistent: true,
    layout: [
      [companion('discord'), StoryRole.PipelineDiscord],
      [companion('brain'), companion('activity')],
    ],
  },
  tags: ['!test'],
};

let fakeCrawl: FakeCrawl | undefined;

/** The timeline's rows; the timeline is a `Logger.List`, whose rows are listbox options. */
const timelineRows = (timeline: HTMLElement) => within(timeline).queryAllByRole('option');

/** Waits for the newest timeline row to contain `text`, reporting the timeline if it never does. */
const findLatest = (timeline: HTMLElement, text: string) =>
  waitFor(
    () => {
      const rows = timelineRows(timeline);
      if (!rows.at(-1)?.textContent?.includes(text)) {
        throw new Error(
          `"${text}" is not the latest entry; the timeline shows: ${rows.map((row) => row.textContent).join(' | ')}`,
        );
      }
    },
    { timeout: 30_000, interval: 250 },
  );

/** Waits for a target row to show `status`. */
const findTarget = (canvas: HTMLElement, id: string, status: string) =>
  waitFor(
    () => {
      const row = within(canvas).getByTestId(`crawl-target-${id}`);
      within(row).getByText(status);
      return row;
    },
    { timeout: 30_000, interval: 250 },
  );

/**
 * The back-index's lifecycle against a fake EDGE crawl host (`installFakeCrawl`): Start sends the space's bound
 * channel to EDGE, each poll steps a target (channel, then the thread it spawned) until the crawl is done, Pause and
 * Resume flip the run status, and a row's reset re-reads that target; the table and the timeline record each step.
 */
export const Scripted: Story = {
  beforeEach: () => {
    fakeCrawl = installFakeCrawl();
    return () => {
      fakeCrawl?.restore();
      fakeCrawl = undefined;
    };
  },
  decorators: createDecorators({
    config: edgeFake,
    onReady: async ({ db, invoker }) => {
      await setupDiscordAgent({ db, invoker, applicationId: '1234567890', channelId: '987654321', guildId: '555' });
    },
  }),
  args: { layout: [[StoryRole.PipelineDiscord], [companion('brain')]] },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const timeline = await canvas.findByTestId('crawl-timeline', {}, { timeout: 60_000 });
    await findLatest(timeline, 'idle');

    // Setup bound one channel in the space, which the form offers and checks.
    const channels = await canvas.findByRole('listbox', { name: 'Channels' }, { timeout: 30_000 });
    await within(channels).findByText('#987654321', {}, { timeout: 30_000 });
    await userEvent.click(await canvas.findByRole('button', { name: 'Start' }));

    await findLatest(timeline, 'running');
    await findLatest(timeline, 'done · 2/2 targets');
    const start = fakeCrawl?.calls.find(({ method }) => method === 'PUT');
    await expect(start?.body).toMatchObject({ applicationId: '1234567890', channels: ['987654321'] });
    await findTarget(canvasElement, 'channel:987654321', 'done');
    await findTarget(canvasElement, 'thread:987654321:1', 'done');
    await expect(canvas.getByTestId('crawl-run-status')).toHaveTextContent('done');

    await userEvent.click(canvas.getByRole('button', { name: 'Pause' }));
    await findLatest(timeline, 'paused');
    await userEvent.click(canvas.getByRole('button', { name: 'Resume' }));
    await findLatest(timeline, 'done');

    // Resetting the channel rewinds only it: it is read again while its thread stays done.
    const messagesBefore = Number(canvas.getByTestId('crawl-messages').textContent);
    await userEvent.click(canvas.getByRole('button', { name: 'Reset #987654321' }));
    await findLatest(timeline, 'running · 1/2 targets');
    await findTarget(canvasElement, 'thread:987654321:1', 'done');
    await findLatest(timeline, 'done · 2/2 targets');
    await findTarget(canvasElement, 'channel:987654321', 'done');
    const reset = fakeCrawl?.calls.find(({ route }) => route === '/reset');
    await expect(reset?.body).toEqual({ targets: ['channel:987654321'] });
    await expect(Number(canvas.getByTestId('crawl-messages').textContent)).toBeGreaterThan(messagesBefore);

    const entries = timelineRows(timeline).map((row) => row.textContent ?? '');
    await expect(entries.some((entry) => entry.includes('paused'))).toBe(true);
  },
};
