//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import * as Effect from 'effect/Effect';
import React, { useEffect, useState } from 'react';

import { withPluginManager } from '@dxos/app-framework/testing';
import { Plan, Project } from '@dxos/assistant-toolkit';
import { Obj, Ref } from '@dxos/echo';
import { ClientPlugin } from '@dxos/plugin-client';
import { initializeIdentity } from '@dxos/plugin-client/testing';
import { PreviewPlugin } from '@dxos/plugin-preview';
import { StorybookPlugin, corePlugins } from '@dxos/plugin-testing';
import { Filter, useQuery, useSpaces } from '@dxos/react-client/echo';
import { Loading } from '@dxos/react-ui/testing';
import { Text } from '@dxos/schema';
import { Organization } from '@dxos/types';

import { translations } from '../../translations';
import { ProjectArticle } from './ProjectArticle';

const EMPTY_PROJECT_NAME = 'Empty project';
const ARTIFACTS_PROJECT_NAME = 'Project with artifacts';

type DefaultStoryProps = {
  targetName: typeof EMPTY_PROJECT_NAME | typeof ARTIFACTS_PROJECT_NAME;
};

const DefaultStory = ({ targetName }: DefaultStoryProps) => {
  const spaces = useSpaces();
  const space = spaces[spaces.length - 1];
  const projects = useQuery(space?.db, Filter.type(Project.Project));
  const [project, setProject] = useState<(typeof projects)[number]>();
  useEffect(() => {
    setProject(projects.find((candidate) => candidate.name === targetName));
  }, [projects, targetName]);

  if (!project) {
    return <Loading />;
  }

  return <ProjectArticle role='article' subject={project} attendableId='story' />;
};

const createEmptyProject = () =>
  Obj.make(Project.Project, {
    name: EMPTY_PROJECT_NAME,
    spec: Ref.make(Text.make('')),
    plan: Ref.make(Plan.makePlan({ tasks: [] })),
    artifacts: [],
    subscriptions: [],
  });

const meta = {
  title: 'plugins/plugin-assistant/containers/ProjectArticle',
  render: DefaultStory,
  argTypes: {
    targetName: {
      control: 'select',
      options: [EMPTY_PROJECT_NAME, ARTIFACTS_PROJECT_NAME],
    },
  },
  decorators: [
    withPluginManager({
      plugins: [
        ...corePlugins(),
        ClientPlugin({
          types: [Project.Project, Plan.Plan, Text.Text, Organization.Organization],
          onClientInitialized: ({ client }) =>
            Effect.gen(function* () {
              yield* initializeIdentity(client);
              const space = yield* Effect.promise(() => client.spaces.create());
              yield* Effect.promise(() => space.waitUntilReady());

              space.db.add(createEmptyProject());
              const organization = space.db.add(
                Obj.make(Organization.Organization, {
                  name: 'Acme Corp',
                  description: 'Sample organization for the story.',
                }),
              );

              space.db.add(
                Obj.make(Project.Project, {
                  name: ARTIFACTS_PROJECT_NAME,
                  spec: Ref.make(Text.make('Initiative spec for the story.')),
                  plan: Ref.make(Plan.makePlan({ tasks: [] })),
                  artifacts: [{ name: 'Organization', data: Ref.make(organization) }],
                  subscriptions: [],
                }),
              );
            }),
        }),
        StorybookPlugin({}),
        PreviewPlugin(),
      ],
    }),
  ],
  parameters: {
    layout: 'fullscreen',
    translations,
  },
} satisfies Meta<DefaultStoryProps>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Empty: Story = {
  args: {
    targetName: EMPTY_PROJECT_NAME,
  },
};

export const WithArtifacts: Story = {
  args: {
    targetName: ARTIFACTS_PROJECT_NAME,
  },
};
