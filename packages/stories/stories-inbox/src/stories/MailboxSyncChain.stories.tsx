//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React from 'react';
import { expect, userEvent, waitFor, within } from 'storybook/test';

import { Feed, Ref } from '@dxos/echo';
import { AccessToken, Connection, Cursor } from '@dxos/link';
import * as Mailbox from '@dxos/plugin-inbox/Mailbox';
import { InboxPlugin } from '@dxos/plugin-inbox/testing';
import { SYNC_TEST_TYPES } from '@dxos/plugin-inbox/testing/sync';
import { translations as inboxTranslations } from '@dxos/plugin-inbox/translations';
import { JMAP_DOMAIN, JMAP_MAIL_CONNECTOR_ID } from '@dxos/plugin-jmap/testing';
import { PreviewPlugin } from '@dxos/plugin-preview/testing';
import {
  Cell,
  ModuleContainer,
  type ModuleContainerProps,
  UpdateCompanionStubPlugin,
  createStoryDecorators,
} from '@dxos/storybook-testing';

import { StoryRole, type SyncRunsConfig } from '../modules/index.ts';
import { StoryModulesPlugin } from '../testing/modules.tsx';

type StoryArgs = SyncRunsConfig & Pick<ModuleContainerProps, 'columns'>;

const DefaultStory = ({ columns }: StoryArgs) => <ModuleContainer columns={columns} />;

/**
 * The mail sync chain on a mock JMAP account: each run stops at its time budget, saves its position,
 * and requests `Operation.runAgain()`, so the next run continues until the whole mailbox is synced.
 * The same harness runs on EDGE, where the budget is 40s inside the 60s invocation limit.
 */
const meta = {
  title: 'stories/stories-inbox/MailboxSyncChain',
  render: DefaultStory,
  decorators: createStoryDecorators<StoryArgs>(({ args: { count, budgetMs, latencyMs } }) => ({
    types: [Feed.Feed, ...SYNC_TEST_TYPES],
    plugins: [InboxPlugin(), PreviewPlugin.make(), UpdateCompanionStubPlugin(), StoryModulesPlugin()],
    onInit: async ({ space }) => {
      const mailbox = space.db.add(Mailbox.make({ name: 'demo@fastmail.test' }));
      const accessToken = space.db.add(AccessToken.make({ source: JMAP_DOMAIN, token: 'mock' }));
      const connection = space.db.add(
        Connection.make({ connectorId: JMAP_MAIL_CONNECTOR_ID, accessToken: Ref.make(accessToken) }),
      );
      space.db.add(
        Cursor.makeExternal({
          source: Connection.getAccessToken(connection),
          target: Ref.make(mailbox),
          options: { syncBackDays: 30 },
        }),
      );
      await space.db.flush({ indexes: true });
      return [[Cell.article(mailbox)], [{ type: StoryRole.SyncRuns, data: { count, budgetMs, latencyMs } }]];
    },
  })),
  parameters: {
    layout: 'fullscreen',
    translations: inboxTranslations,
  },
} satisfies Meta<typeof DefaultStory>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    count: 120,
    budgetMs: 4_000,
    latencyMs: 350,
    columns: '3fr_2fr',
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const sync = await canvas.findByTestId('sync-runs.sync', undefined, { timeout: 12_000 });
    await waitFor(() => expect(sync).toBeEnabled(), { timeout: 12_000 });
    await userEvent.click(sync);
    await waitFor(() => expect(canvas.getByTestId('sync-runs.total')).toHaveTextContent('120 / 120 messages'), {
      timeout: 60_000,
    });
    // More than one run: the budget, not the item cap, ended the earlier ones.
    await expect(canvas.getByTestId('sync-runs.run-2')).toBeInTheDocument();
  },
};

/** {@link Default} without its `play` function, for driving by hand or recording a demo. */
export const Interactive: Story = {
  args: Default.args,
};
