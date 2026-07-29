//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import * as Effect from 'effect/Effect';
import React, { useCallback, useState } from 'react';
import { expect, userEvent, waitFor, within } from 'storybook/test';

import { withPluginManager } from '@dxos/app-framework/testing';
import { Surface, useOperationInvoker } from '@dxos/app-framework/ui';
import { AppActivationEvents } from '@dxos/app-toolkit';
import { AppSurface } from '@dxos/app-toolkit/ui';
import { Project } from '@dxos/compute';
import { Filter } from '@dxos/echo';
import { useQuery } from '@dxos/echo-react';
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

const INBOX_RESEARCH_TEMPLATE_ID = 'org.dxos.project.inboxResearch';

/**
 * UC-A (USE-CASES.md §4.2): "Set up project" on a mailbox scaffolds the pre-wired Inbox Research
 * project — mailbox as standing context, inbox/table skills, and the feed-triggered Sender Ledger
 * starter routine — and renders the real ProjectArticle for it.
 */
const Story = () => {
  const [space] = useSpaces();
  const [mailbox] = useQuery(space?.db, Filter.type(Mailbox.Mailbox));
  const [project] = useQuery(space?.db, Filter.type(Project.Project));
  const { invokePromise } = useOperationInvoker();
  const [error, setError] = useState<string>();

  const handleCreate = useCallback(() => {
    if (!mailbox || !space) {
      return;
    }
    // Surface a failed setup in the story UI rather than leaving the rejection unobserved.
    invokePromise(
      ProjectOperation.Create,
      { templateId: INBOX_RESEARCH_TEMPLATE_ID, subject: mailbox },
      { spaceId: space.id },
    ).catch((cause: unknown) => setError(String(cause)));
  }, [mailbox, space, invokePromise]);

  if (!space?.db || !mailbox) {
    return <Loading data={{ db: !!space?.db, mailbox: !!mailbox }} />;
  }

  if (error) {
    return <div role='alert'>{error}</div>;
  }

  return (
    <div className='flex flex-col h-full'>
      {!project ? (
        <Button data-testid='sender-ledger.setup' onClick={handleCreate}>
          Set up project
        </Button>
      ) : (
        <Surface.Surface type={AppSurface.Article} data={{ subject: project, attendableId: project.id }} limit={1} />
      )}
    </div>
  );
};

const meta = {
  title: 'stories/stories-projects/SenderLedger',
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
 * Test (manual):
 * 1. Click "Set up project" — the Inbox Research project article opens.
 * 2. The Instructions section shows the seeded brief; Context lists the Work mailbox.
 * 3. The Routines gallery shows the "Sender Ledger" routine card (trigger disabled).
 */
export const Default: StoryType = {};

/** Template scaffold through the real operation stack: structure asserted against the space db. */
export const Test: StoryType = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    // Client init (identity + space + indexed flush) gates the first render.
    const button = await waitFor(() => canvas.getByTestId('sender-ledger.setup'), { timeout: 30_000 });
    await userEvent.click(button);

    // The article renders for the created project (name from the template).
    await waitFor(async () => expect(canvas.getByDisplayValue(/Inbox Research — Work/)).toBeInTheDocument(), {
      timeout: 30_000,
    });

    // The routines gallery shows the starter routine.
    await waitFor(async () => expect(canvas.getByText('Sender Ledger')).toBeInTheDocument(), { timeout: 10_000 });

    // The Context section (standing context, distinct from Artifacts) renders with both galleries.
    await expect(canvas.getByText('Context')).toBeInTheDocument();
    await expect(canvas.getByText('Artifacts')).toBeInTheDocument();
  },
};
