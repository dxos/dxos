//
// Copyright 2025 DXOS.org
//

import '@dxos-theme';

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React from 'react';

import { Filter, Ref } from '@dxos/client/echo';
import { toJsonSchema } from '@dxos/echo-schema';
import { faker } from '@dxos/random';
import { useQuery, useSpaces } from '@dxos/react-client/echo';
import { withClientProvider } from '@dxos/react-client/testing';
import { DataType, createView } from '@dxos/schema';
import { Testing, createObjectFactory } from '@dxos/schema/testing';
import { withLayout, withTheme } from '@dxos/storybook-utils';

import { Project } from './Project';

const DefaultStory = () => {
  const [space] = useSpaces();
  const projects = useQuery(space, Filter.typename(DataType.Project.typename));
  const project = projects[0];

  console.log('[default]', space, projects, project);

  if (!project) {
    return <>Loading…</>;
  }

  return <Project project={project} />;
};

const meta: Meta<typeof Project> = {
  title: 'plugins/plugin-project/Project',
  component: Project,
  render: DefaultStory,
  decorators: [withLayout({ fullscreen: true }), withTheme],
};

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  decorators: [
    withClientProvider({
      types: [DataType.Project, DataType.View, DataType.Collection, Testing.Contact],
      createIdentity: true,
      createSpace: true,
      onSpaceCreated: async ({ client, space }) => {
        // Create a project
        const project = DataType.makeProject({
          collections: [],
        });

        // Create a view for contacts
        const view = createView({
          name: 'Contacts',
          typename: Testing.Contact.typename,
          jsonSchema: toJsonSchema(Testing.ContactSchema),
          presentation: project,
        });

        project.collections.push(Ref.make(view));

        space.db.add(view);
        space.db.add(project);

        // Generate random contacts
        const factory = createObjectFactory(space.db, faker as any);
        await factory([{ type: Testing.Contact, count: 12 }]);
      },
    }),
    withLayout({ fullscreen: true }),
    withTheme,
  ],
};
