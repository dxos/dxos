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
  type FakeBrain,
  ModuleContainer,
  type ModuleLayout,
  addDiscordConnection,
  createDecorators,
  edgeFake,
  installFakeBrain,
  setupAgent,
  setupDiscordAgent,
  startFakeBackIndexRunner,
  storyConfig,
  storyParameters,
} from '../testing/index.ts';

type StoryArgs = {
  layout?: ModuleLayout;
  /** Keeps the profile (space, bindings, fact feed) across reloads; a change reboots the story. */
  persistent?: boolean;
};

const meta: Meta<StoryArgs> = {
  title: 'stories/stories-agent/DiscordPipeline',
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
 * The Discord back-index against a real Discord server: a remote timer trigger runs plugin-discord's
 * `CrawlDiscordChannels` on EDGE with the space's Discord token, keeps its progress in a `CrawlState` and appends the
 * facts it extracts to a fact feed, which the agent's brain indexes once the feed is registered with it. Needs an EDGE
 * with the brain's fact feed routes (the edge branch `dm/elegant-euler-at56gd`, local or deployed) and the Discord setup
 * in the package README.
 *
 * Try:
 * 1. Discord: **Connect Discord**, **Install** Kai in a server, **Refresh**, pick the server and **Connect** a channel.
 * 2. Discord back-index: pick the **Connection**, check the channel under Channels, set **Max days** (e.g. 30) and the
 *    **Interval**.
 * 3. **Start**: the crawl state, fact feed and trigger are created; the channel appears under Targets, pending.
 * 4. Each run (or **Run now**) moves the targets and the counters; the timeline records each change of the crawl state.
 * 5. **Agent brain** on: the brain indexes the fact feed; the brain companion lists the facts.
 * 6. **Pause**, then **Resume**: the trigger is switched off and on; the crawl continues from each target's cursor.
 * 7. A row's reset button re-reads that channel or thread; **Reset all** re-reads everything, at no model cost.
 * 8. Reload: everything lives in the space, so the back-index carries on.
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

let fakeBrain: FakeBrain | undefined;

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
 * The back-index's lifecycle with EDGE faked (`startFakeBackIndexRunner` steps the crawl state while the trigger is
 * enabled; `installFakeBrain` answers the fact feed routes): Start creates the crawl state, fact feed and trigger for
 * the space's bound channel; the targets (channel, then the thread it spawned) finish; Pause and Resume flip the
 * trigger; a row's reset rewinds that target; the brain toggle registers the fact feed.
 */
export const Scripted: Story = {
  beforeEach: () => {
    fakeBrain = installFakeBrain();
    return () => {
      fakeBrain?.restore();
      fakeBrain = undefined;
    };
  },
  decorators: createDecorators({
    config: edgeFake,
    onReady: async ({ db, invoker }) => {
      await setupDiscordAgent({ db, invoker, applicationId: '1234567890', channelId: '987654321', guildId: '555' });
      addDiscordConnection(db);
      return startFakeBackIndexRunner(db);
    },
  }),
  args: { layout: [[StoryRole.PipelineDiscord], [companion('brain')]] },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const timeline = await canvas.findByTestId('crawl-timeline', {}, { timeout: 60_000 });

    // Setup bound one channel in the space, which the form offers and checks.
    const channels = await canvas.findByRole('listbox', { name: 'Channels' }, { timeout: 30_000 });
    await within(channels).findByText('#987654321', {}, { timeout: 30_000 });
    await userEvent.click(await canvas.findByRole('button', { name: 'Start' }));

    // The fake trigger run finishes the channel, then the thread it spawned.
    await findTarget(canvasElement, '987654321', 'done');
    await findTarget(canvasElement, '9876543211', 'done');
    await findLatest(timeline, 'done · 2/2 targets');
    await expect(canvas.getByTestId('crawl-run-status')).toHaveTextContent('done');
    await expect(Number(canvas.getByTestId('crawl-facts').textContent)).toBeGreaterThan(0);

    // Paused, the trigger is off and a reset target stays pending; resumed, it is read again.
    await userEvent.click(canvas.getByRole('button', { name: 'Pause' }));
    await findLatest(timeline, 'paused');
    const messagesBefore = Number(canvas.getByTestId('crawl-messages').textContent);
    await userEvent.click(canvas.getByRole('button', { name: 'Reset #987654321' }));
    await findTarget(canvasElement, '987654321', 'pending');
    await new Promise((resolve) => setTimeout(resolve, 1_500));
    await expect(Number(canvas.getByTestId('crawl-messages').textContent)).toBe(messagesBefore);
    await findTarget(canvasElement, '9876543211', 'done');
    await userEvent.click(canvas.getByRole('button', { name: 'Resume' }));
    await findTarget(canvasElement, '987654321', 'done');
    await findLatest(timeline, 'done · 2/2 targets');
    await expect(Number(canvas.getByTestId('crawl-messages').textContent)).toBeGreaterThan(messagesBefore);

    // The brain toggle registers the fact feed with the agent's brain.
    await userEvent.click(canvas.getByTestId('crawl-brain'));
    await waitFor(() => expect(fakeBrain?.calls.some(({ method, feed }) => method === 'POST' && !!feed)).toBe(true));

    const entries = timelineRows(timeline).map((row) => row.textContent ?? '');
    await expect(entries.some((entry) => entry.includes('paused'))).toBe(true);
  },
};
