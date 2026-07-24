//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import * as Effect from 'effect/Effect';
import React from 'react';

import { withPluginManager } from '@dxos/app-framework/testing';
import { AppActivationEvents } from '@dxos/app-toolkit';
import { Project } from '@dxos/compute';
import { Filter } from '@dxos/echo';
import { useQuery } from '@dxos/echo-react';
import { ClientPlugin, initializeIdentity } from '@dxos/plugin-client/testing';
import { StorybookPlugin, corePlugins } from '@dxos/plugin-testing';
import { useSpaces } from '@dxos/react-client/echo';
import { Loading, withLayout, withTheme } from '@dxos/react-ui/testing';
import { translations as reactUiTranslations } from '@dxos/react-ui/translations';

import { translations } from '../../translations';
import { ProjectArticle } from './ProjectArticle';

const DefaultStory = () => {
  const [space] = useSpaces();
  const projects = useQuery(space?.db, Filter.type(Project.Project));
  const project = projects.find((entry) => entry.name === name);
  if (!space?.db || !project) {
    return <Loading data={{ db: !!space?.db, project: !!project }} />;
  }

  return <ProjectArticle role='article' subject={project} attendableId='test' />;
};

const meta = {
  title: 'plugins/plugin-projects/containers/ProjectArticle',
  render: DefaultStory,
  decorators: [
    withLayout({ layout: 'fullscreen' }),
    withTheme(),
    withPluginManager({
      setupEvents: [AppActivationEvents.SetupSettings],
      plugins: [
        ...corePlugins(),
        ClientPlugin({
          types: [Project.Project],
          onClientInitialized: ({ client }) =>
            Effect.gen(function* () {
              const { personalSpace } = yield* initializeIdentity(client);
              yield* Effect.promise(async () => {
                personalSpace.db.add(
                  Project.make({
                    name: 'Project 1',
                  }),
                );

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

export const Default: Story = {};
