//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import * as Effect from 'effect/Effect';
import React from 'react';
import { expect, waitFor, within } from 'storybook/test';

import { withPluginManager } from '@dxos/app-framework/testing';
import { AppActivationEvents } from '@dxos/app-toolkit';
import { Instructions, Project, Routine, Skill } from '@dxos/compute';
import { Collection, Filter, Obj, Ref } from '@dxos/echo';
import { useQuery } from '@dxos/echo-react';
import { ClientPlugin, initializeIdentity } from '@dxos/plugin-client/testing';
import { StorybookPlugin, corePlugins } from '@dxos/plugin-testing';
import { type Space, useSpaces } from '@dxos/react-client/echo';
import { Loading, withLayout, withTheme } from '@dxos/react-ui/testing';
import { translations as reactUiTranslations } from '@dxos/react-ui/translations';
import { Text } from '@dxos/schema';

import { translations } from '#translations';

import { ProjectArticle } from './ProjectArticle';

const PROJECT_NAME = 'Project 1';

/**
 * Seed a project with the same owned-object graph the create-object capability builds: an owned
 * Instructions document and an owned artifacts Collection, plus one linked (non-owned) Routine.
 */
const seedProject = (space: Space) => {
  const project = Project.make({ name: PROJECT_NAME, description: 'Track the plugin-projects milestone.' });
  const instructions = Instructions.make({ text: 'You are an assistant focused on this project.' });
  Obj.setParent(instructions, project);
  const artifacts = Collection.make();
  Obj.setParent(artifacts, project);
  Obj.update(project, (project) => {
    project.instructions = Ref.make(instructions);
    project.artifacts = Ref.make(artifacts);
  });

  const routine = space.db.add(Routine.make({ name: 'Daily Digest' }));
  Obj.update(project, (project) => {
    project.routines = [...project.routines, Ref.make(routine)];
  });

  space.db.add(project);
};

const DefaultStory = () => {
  const [space] = useSpaces();
  const projects = useQuery(space?.db, Filter.type(Project.Project));
  const project = projects.find((entry) => entry.name === PROJECT_NAME);
  if (!space?.db || !project) {
    return <Loading data={{ db: !!space?.db, project: !!project }} />;
  }

  return <ProjectArticle role='article' subject={project} attendableId='test' />;
};

const meta = {
  title: 'plugins/plugin-projects/containers/ProjectArticle',
  render: DefaultStory,
  decorators: [
    withTheme(),
    withLayout({ layout: 'fullscreen' }),
    withPluginManager({
      setupEvents: [AppActivationEvents.SetupSettings],
      plugins: [
        ...corePlugins(),
        ClientPlugin({
          types: [
            Project.Project,
            Instructions.Instructions,
            Collection.Collection,
            Routine.Routine,
            Skill.Skill,
            Text.Text,
          ],
          onClientInitialized: ({ client }) =>
            Effect.gen(function* () {
              const { personalSpace } = yield* initializeIdentity(client);
              yield* Effect.promise(async () => {
                seedProject(personalSpace);
                await personalSpace.db.flush({ indexes: true });
              });
            }),
        }),
        StorybookPlugin({}),
      ],
    }),
  ],
  parameters: {
    layout: 'fullscreen',
    controls: { disable: true },
    translations: [...translations, ...reactUiTranslations],
  },
} satisfies Meta<typeof DefaultStory>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    // Header form: the project name renders as the editable name field's value. Identity/space
    // setup runs async, so allow more than testing-library's default 1s timeout.
    await expect(canvas.findByDisplayValue(PROJECT_NAME, undefined, { timeout: 10_000 })).resolves.toBeTruthy();

    // Instructions: the owned Instructions markdown editor mounts.
    await waitFor(() => expect(canvasElement.querySelector('.cm-editor')).toBeTruthy(), { timeout: 10_000 });

    // Routines / Artifacts: section headings render, and the seeded routine's label resolves.
    await expect(canvas.findByText('Routines', undefined, { timeout: 10_000 })).resolves.toBeTruthy();
    await expect(canvas.findByText('Artifacts', undefined, { timeout: 10_000 })).resolves.toBeTruthy();
    await expect(canvas.findByText('Daily Digest', undefined, { timeout: 10_000 })).resolves.toBeTruthy();
  },
};
