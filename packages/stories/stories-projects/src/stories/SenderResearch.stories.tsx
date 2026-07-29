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
import { AssistantPlugin } from '@dxos/plugin-assistant/plugin';
import { ClientPlugin, initializeIdentity } from '@dxos/plugin-client/testing';
import { CrmPlugin } from '@dxos/plugin-crm/plugin';
import { Mailbox } from '@dxos/plugin-inbox';
import { InboxPlugin } from '@dxos/plugin-inbox/testing';
import { translations as inboxTranslations } from '@dxos/plugin-inbox/translations';
import { MarkdownPlugin } from '@dxos/plugin-markdown/plugin';
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

const CRM_RESEARCH_TEMPLATE_ID = 'org.dxos.project.crmResearch';

/**
 * UC-B (USE-CASES.md §4.3): the CRM research automation reframed as a project — profiles and
 * dossier documents become project artifacts, the mailbox is standing context, and the per-message
 * research routine is owned by the project.
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
      { templateId: CRM_RESEARCH_TEMPLATE_ID, subject: mailbox },
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
        <Button data-testid='sender-research.setup' onClick={handleCreate}>
          Set up project
        </Button>
      ) : (
        <Surface.Surface type={AppSurface.Article} data={{ subject: project, attendableId: project.id }} limit={1} />
      )}
    </div>
  );
};

const meta = {
  title: 'stories/stories-projects/SenderResearch',
  render: Story,
  decorators: [
    withLayout({ layout: 'column' }),
    withTheme(),
    withPluginManager({
      // SetupArtifactDefinition activates the plugins' skill-definition modules; without it the
      // registry holds no skills, so the article's skill rows and picker render empty.
      setupEvents: [AppActivationEvents.SetupSettings, AppActivationEvents.SetupArtifactDefinition],
      plugins: [
        ...corePlugins(),
        ClientPlugin({
          types: [Mailbox.Mailbox, Project.Project],
          onClientInitialized: ({ client }) =>
            Effect.gen(function* () {
              const { personalSpace } = yield* initializeIdentity(client);
              yield* Effect.promise(async () => {
                personalSpace.db.add(Mailbox.make({ name: 'Clients' }));
                await personalSpace.db.flush({ indexes: true });
              });
            }),
        }),
        StorybookPlugin({}),
        SpacePlugin({}),
        InboxPlugin(),
        CrmPlugin(),
        // Own the webSearch/database and markdown skill definitions the template references —
        // skill rows resolve labels from the registry, which only holds loaded plugins' skills.
        AssistantPlugin(),
        MarkdownPlugin(),
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
 * 1. Click "Set up project" — the Sender Research project article opens.
 * 2. Context lists the Clients mailbox; the Routines gallery shows "Sender Research" (disabled).
 * 3. With a live model: enable the trigger, add a message to the mailbox feed, and watch
 *    Person/Organization cards appear in the Artifacts gallery.
 */
export const Default: StoryType = {};

/** Template scaffold through the real operation stack: structure asserted against the rendered article. */
export const Test: StoryType = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const button = await waitFor(() => canvas.getByTestId('sender-research.setup'), { timeout: 30_000 });
    await userEvent.click(button);

    await waitFor(async () => expect(canvas.getByDisplayValue(/Sender Research — Clients/)).toBeInTheDocument(), {
      timeout: 30_000,
    });
    await waitFor(async () => expect(canvas.getByText('Sender Research')).toBeInTheDocument(), {
      timeout: 10_000,
    });
  },
};
