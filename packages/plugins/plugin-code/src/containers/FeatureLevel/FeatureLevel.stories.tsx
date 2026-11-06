//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import * as Effect from 'effect/Effect';
import React from 'react';
import { expect, screen, userEvent, waitFor, within } from 'storybook/test';

import * as Surface from '@dxos/app-framework/Surface';
import { withPluginManager } from '@dxos/app-framework/testing';
import * as AppSurface from '@dxos/app-toolkit/AppSurface';
import * as Project from '@dxos/compute/Project';
import * as Spec from '@dxos/compute/Spec';
import { Filter, Obj, Ref } from '@dxos/echo';
import { useQuery } from '@dxos/echo-react';
import * as AssistantPlugin from '@dxos/plugin-assistant/AssistantPlugin';
import { ClientPlugin, initializeIdentity } from '@dxos/plugin-client/testing';
import { FeatureEditingPlugin, FeatureSeed } from '@dxos/plugin-code/testing';
import * as MarkdownPlugin from '@dxos/plugin-markdown/MarkdownPlugin';
import * as ProjectsPlugin from '@dxos/plugin-projects/ProjectsPlugin';
import * as SpecSession from '@dxos/plugin-projects/SpecSession';
import { translations as projectsTranslations } from '@dxos/plugin-projects/translations';
import * as TasksPlugin from '@dxos/plugin-tasks/TasksPlugin';
import * as CorePlugins from '@dxos/plugin-testing/CorePlugins';
import * as StorybookPlugin from '@dxos/plugin-testing/StorybookPlugin';
import * as VideoPlugin from '@dxos/plugin-video/VideoPlugin';
import { useSpaces } from '@dxos/react-client/echo';
import { AttendableContainer } from '@dxos/react-ui-attention';
import { translations as formTranslations } from '@dxos/react-ui-form/translations';
import { withMosaic } from '@dxos/react-ui-mosaic/testing';
import { Loading, withLayout, withTheme } from '@dxos/react-ui/testing';
import { translations as reactUiTranslations } from '@dxos/react-ui/translations';
import { Outline, TaskSet } from '@dxos/types';

import { translations } from '#translations';
import { Feature } from '#types';

const PROJECT_NAME = 'Inbox';
const SPEC_NAME = 'Inbox and agents';
const TALK_SPEC_NAME = 'Launch talk';

type StoryArgs = {
  attendableId: string;
  /** The seeded feature whose level of the project the article opens; the project's own level when absent. */
  featureName?: string;
};

/** Opens the project, or one of its features, with its Structure companion beside it, as the deck does. */
const DefaultStory = ({ attendableId, featureName }: StoryArgs) => {
  const [space] = useSpaces();
  const project = useQuery(space?.db, Filter.type(Project.Project)).find((entry) => entry.name === PROJECT_NAME);
  const feature = useQuery(featureName ? space?.db : undefined, Filter.type(Feature.Feature)).find(
    (entry) => entry.name === featureName,
  );
  const subject = featureName ? feature : project;
  if (!subject) {
    return <Loading data={{ db: !!space?.db, project: !!project, feature: !!feature }} />;
  }

  return (
    <AttendableContainer id={attendableId} classNames='grid grid-cols-2 dx-fill'>
      <Surface.Surface type={AppSurface.Article} data={{ subject, attendableId }} limit={1} />
      <Surface.Surface
        type={AppSurface.Article}
        data={{ subject: SpecSession.companionVariant('structure'), companionTo: subject, attendableId }}
        limit={1}
      />
    </AttendableContainer>
  );
};

// Long enough for the first story's cold boot of the plugin stack in a full parallel run.
const showTab = async (canvas: ReturnType<typeof within>, tab: string) => {
  await userEvent.click(await canvas.findByTestId(`projectsPlugin.tab.${tab}`, undefined, { timeout: 30_000 }));
};

const showBoard = async (canvas: ReturnType<typeof within>) => {
  await userEvent.click(await canvas.findByTestId('spec-companion.view.kanban', undefined, { timeout: 10_000 }));
  await waitFor(() => expect(canvas.getAllByTestId('board-column').length).toBeGreaterThan(0), { timeout: 10_000 });
};

/** Opens the spec picker and shows the spec named `name`. */
const pickSpec = async (canvas: ReturnType<typeof within>, name: string) => {
  await userEvent.click(await canvas.findByTestId('projectsPlugin.specPicker', undefined, { timeout: 10_000 }));
  await userEvent.click(within(await screen.findByRole('menu', undefined, { timeout: 10_000 })).getByText(name));
  await waitFor(() => expect(canvas.getByTestId('projectsPlugin.specPicker').textContent).toContain(name), {
    timeout: 10_000,
  });
};

/** Opens the Extensions menu and returns the item of the package labelled `label`. */
const findPackage = async (canvas: ReturnType<typeof within>, label: string) => {
  await userEvent.click(await canvas.findByTestId('projectsPlugin.specExtensions', undefined, { timeout: 10_000 }));
  const item = within(await screen.findByRole('menu', undefined, { timeout: 10_000 })).getByText(label);
  return item.closest<HTMLElement>('[role="menuitemcheckbox"]') ?? item;
};

const meta = {
  title: 'plugins/plugin-code/containers/FeatureLevel',
  render: DefaultStory,
  decorators: [
    withLayout({ layout: 'fullscreen' }),
    withPluginManager({
      plugins: [
        ...CorePlugins.make(),
        ClientPlugin.make({
          types: [...new Set([...FeatureSeed.types, Outline.Outline, TaskSet.TaskSet])],
          onClientInitialized: ({ client }) =>
            Effect.gen(function* () {
              const { defaultSpace } = yield* initializeIdentity(client);
              yield* Effect.promise(async () => {
                const project = defaultSpace.db.add(Project.make({ name: PROJECT_NAME }));
                FeatureSeed.seed(defaultSpace.db, { name: SPEC_NAME, project, layout: FeatureSeed.INBOX_LAYOUT });
                const talk = defaultSpace.db.add(Spec.make({ name: TALK_SPEC_NAME, content: 'A ten-minute talk.' }));
                Obj.update(project, (project) => {
                  project.specs.push(Ref.make(talk));
                });
                await defaultSpace.db.flush({ indexes: true });
              });
            }),
        }),
        StorybookPlugin.make({}),
        // Draws the feature embeds.
        MarkdownPlugin.make(),
        // The project article and its levels; the feature stack fills in the views, overviews and embeds.
        ProjectsPlugin.make(),
        // plugin-projects' declared dependencies.
        AssistantPlugin.make(),
        TasksPlugin.make(),
        FeatureEditingPlugin.make(),
        // A second plugin's extension package, beside the software one.
        VideoPlugin.make(),
      ],
    }),
    // The deck provides the drag-and-drop root in the app; the Kanban view needs one here.
    withMosaic(),
    withTheme(),
  ],
  parameters: {
    layout: 'fullscreen',
    controls: { disable: true },
    translations: [...translations, ...projectsTranslations, ...reactUiTranslations, ...formTranslations],
  },
  args: { attendableId: 'test' },
} satisfies Meta<typeof DefaultStory>;

export default meta;

type Story = StoryObj<typeof meta>;

/** The project at its own level, on its Overview; the autocue demo starts here. */
export const Default: Story = {};

/**
 * The project's Specs tab: a spec in the software dialect shows its features embedded in its text, and its board joins
 * its Structure companion.
 */
export const SoftwareSpec: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await showTab(canvas, 'spec');
    const document = await canvas.findByTestId('projectsPlugin.spec.document', undefined, { timeout: 10_000 });
    await waitFor(() => expect(within(document).getAllByTestId('markdown.embed').length).toBeGreaterThan(0), {
      timeout: 10_000,
    });
    await showBoard(canvas);
  },
};

/** Checking the Software package in the Extensions menu gives a spec of prose its board. */
export const SoftwarePackage: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await showTab(canvas, 'spec');
    await pickSpec(canvas, SPEC_NAME);
    await expect((await findPackage(canvas, 'Software')).getAttribute('aria-checked')).toBe('true');
    await userEvent.keyboard('{Escape}');

    await pickSpec(canvas, TALK_SPEC_NAME);
    await expect(canvas.queryByTestId('spec-companion.view.kanban')).toBeNull();
    const software = await findPackage(canvas, 'Software');
    await expect(software.getAttribute('aria-checked')).toBe('false');
    await userEvent.click(software);
    await expect(
      canvas.findByTestId('spec-companion.view.kanban', undefined, { timeout: 10_000 }),
    ).resolves.toBeTruthy();
  },
};

/** One level down: a feature with a breakdown, its overview the feature and its Spec tab the breakdown's map. */
export const WithBreakdown: Story = {
  args: { featureName: 'Provider sync' },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await showTab(canvas, 'overview');
    await expect(
      canvas.findByTestId('feature-article.subfeatures', undefined, { timeout: 10_000 }),
    ).resolves.toBeTruthy();
    await showTab(canvas, 'spec');
    await showBoard(canvas);
    await waitFor(
      () =>
        expect(canvas.getAllByTestId('feature-kanban.card').some((card) => card.textContent?.includes('Gmail'))).toBe(
          true,
        ),
      { timeout: 10_000 },
    );
  },
};

/** A feature without a breakdown: its Spec tab is empty until Add spec breaks it down. */
export const WithoutBreakdown: Story = {
  args: { featureName: 'Compose & send' },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await showTab(canvas, 'spec');
    const empty = await canvas.findByTestId('projectsPlugin.spec.empty', undefined, { timeout: 10_000 });
    await expect(within(empty).getByText(/no spec of its own/)).toBeTruthy();
    await userEvent.click(within(empty).getByTestId('projectsPlugin.addSpec'));
    await expect(
      canvas.findByTestId('spec-companion.view.kanban', undefined, { timeout: 10_000 }),
    ).resolves.toBeTruthy();
  },
};
