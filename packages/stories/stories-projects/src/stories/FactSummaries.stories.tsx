//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import * as Effect from 'effect/Effect';
import React, { useCallback } from 'react';
import { expect, userEvent, waitFor, within } from 'storybook/test';

import { withPluginManager } from '@dxos/app-framework/testing';
import { Surface, useOperationInvoker } from '@dxos/app-framework/ui';
import { AppActivationEvents } from '@dxos/app-toolkit';
import { AppSurface } from '@dxos/app-toolkit/ui';
import { Project } from '@dxos/compute';
import { Filter } from '@dxos/echo';
import { useQuery } from '@dxos/echo-react';
import { BrainPlugin } from '@dxos/plugin-brain/plugin';
import { ClientPlugin, initializeIdentity } from '@dxos/plugin-client/testing';
import { Mailbox } from '@dxos/plugin-inbox';
import { InboxPlugin } from '@dxos/plugin-inbox/testing';
import { translations as inboxTranslations } from '@dxos/plugin-inbox/translations';
import { ProjectsPlugin } from '@dxos/plugin-projects/plugin';
import { translations as projectsTranslations } from '@dxos/plugin-projects/translations';
import { ProjectOperation } from '@dxos/plugin-projects/types';
import { RoutinePlugin } from '@dxos/plugin-routine/plugin';
import { translations as routineTranslations } from '@dxos/plugin-routine/translations';
import { SpacePlugin } from '@dxos/plugin-space/testing';
import { StorybookPlugin, corePlugins } from '@dxos/plugin-testing';
import { useSpaces } from '@dxos/react-client/echo';
import { Button } from '@dxos/react-ui';
import { translations as formTranslations } from '@dxos/react-ui-form/translations';
import { Loading, withLayout, withTheme } from '@dxos/react-ui/testing';
import { translations as reactUiTranslations } from '@dxos/react-ui/translations';

const MAILBOX_FACTS_TEMPLATE_ID = 'org.dxos.project.mailboxFacts';

/**
 * UC-C (USE-CASES.md §4.4): the fact-store loop as a project — a scheduled operation-action routine
 * runs `AnalyzeMailbox` (deterministic pipeline, no model in the trigger loop) and project chats
 * answer "where things stand" questions from the facts via the brain skill.
 */
const Story = () => {
  const [space] = useSpaces();
  const [mailbox] = useQuery(space?.db, Filter.type(Mailbox.Mailbox));
  const [project] = useQuery(space?.db, Filter.type(Project.Project));
  const { invokePromise } = useOperationInvoker();

  const handleCreate = useCallback(() => {
    if (!mailbox || !space) {
      return;
    }
    void invokePromise(
      ProjectOperation.Create,
      { templateId: MAILBOX_FACTS_TEMPLATE_ID, subject: mailbox },
      { spaceId: space.id },
    );
  }, [mailbox, space, invokePromise]);

  if (!space?.db || !mailbox) {
    return <Loading data={{ db: !!space?.db, mailbox: !!mailbox }} />;
  }

  return (
    <div className='flex flex-col h-full'>
      {!project ? (
        <Button data-testid='fact-summaries.setup' onClick={handleCreate}>
          Set up project
        </Button>
      ) : (
        <Surface.Surface type={AppSurface.Article} data={{ subject: project, attendableId: project.id }} limit={1} />
      )}
    </div>
  );
};

const meta = {
  title: 'stories/stories-projects/FactSummaries',
  render: Story,
  decorators: [
    withLayout({ layout: 'fullscreen' }),
    withTheme(),
    withPluginManager({
      setupEvents: [AppActivationEvents.SetupSettings],
      plugins: [
        ...corePlugins(),
        ClientPlugin({
          types: [Mailbox.Mailbox, Project.Project],
          onClientInitialized: ({ client }) =>
            Effect.gen(function* () {
              const { personalSpace } = yield* initializeIdentity(client);
              yield* Effect.promise(async () => {
                personalSpace.db.add(Mailbox.make({ name: 'Work' }));
                await personalSpace.db.flush({ indexes: true });
              });
            }),
        }),
        StorybookPlugin({}),
        SpacePlugin({}),
        InboxPlugin(),
        BrainPlugin(),
        ProjectsPlugin(),
        RoutinePlugin(),
      ],
    }),
  ],
  parameters: {
    layout: 'fullscreen',
    controls: { disable: true },
    translations: [
      ...projectsTranslations,
      ...inboxTranslations,
      ...routineTranslations,
      ...formTranslations,
      ...reactUiTranslations,
    ],
  },
} satisfies Meta<typeof Story>;

export default meta;

type StoryType = StoryObj<typeof meta>;

/**
 * Test (manual, live model — e.g. ollama via the brain settings, or EDGE):
 * 1. Click "Set up project" — the Mailbox Facts project article opens.
 * 2. Context lists the Work mailbox; Routines shows "Analyze Mailbox" (a scheduled operation
 *    action, disabled).
 * 3. Seed messages into the mailbox, run Analyze from the mailbox toolbar (or enable the trigger),
 *    and confirm facts in the mailbox's Facts companion.
 * 4. Open a project chat and ask "summarize where things stand with <sender>" — the reply is
 *    grounded in facts and cites source messages.
 */
export const Default: StoryType = {};

/** Template scaffold through the real operation stack: structure asserted against the rendered article. */
export const Test: StoryType = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const button = await waitFor(() => canvas.getByTestId('fact-summaries.setup'), { timeout: 30_000 });
    await userEvent.click(button);

    await waitFor(async () => expect(canvas.getByDisplayValue(/Mailbox Facts — Work/)).toBeInTheDocument(), {
      timeout: 30_000,
    });
    await waitFor(async () => expect(canvas.getByText('Analyze Mailbox')).toBeInTheDocument(), { timeout: 10_000 });
  },
};
