//
// Copyright 2025 DXOS.org
//

import '@dxos-theme';

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React from 'react';

import { Filter, Ref } from '@dxos/client/echo';
import { Obj, Type } from '@dxos/echo';
import { faker } from '@dxos/random';
import { useQuery } from '@dxos/react-client/echo';
import { useClientProvider, withClientProvider } from '@dxos/react-client/testing';
import { Form } from '@dxos/react-ui-form';
import { DataType, createView } from '@dxos/schema';
import { createObjectFactory } from '@dxos/schema/testing';
import { withLayout, withTheme } from '@dxos/storybook-utils';

import { type ItemProps, Project } from './Project';

const StorybookProjectItem = ({ item, projectionModel }: ItemProps) => {
  if (Obj.instanceOf(DataType.Person, item)) {
    const contact = item as Obj.Obj<DataType.Person>;
    return <Form values={contact} schema={DataType.Person} projection={projectionModel} autoSave />;
  }
  return <span>{item.id}</span>;
};

const DefaultStory = () => {
  const { space } = useClientProvider();
  const projects = useQuery(space, Filter.typename(DataType.Project.typename));
  const project = projects[0];

  if (!project) {
    return <p>Loading…</p>;
  }

  return (
    <Project.Root Item={StorybookProjectItem}>
      <Project.Content project={project} />
    </Project.Root>
  );
};

const meta: Meta<typeof Project> = {
  title: 'plugins/plugin-project/Project',
  render: DefaultStory,
  decorators: [withLayout({ fullscreen: true }), withTheme],
};

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  decorators: [
    withClientProvider({
      types: [DataType.Project, DataType.View, DataType.Collection, DataType.Person],
      createIdentity: true,
      createSpace: true,
      onSpaceCreated: async ({ space }) => {
        // Create a project
        const project = DataType.makeProject({
          collections: [],
        });

        // Create a view for contacts
        const view = createView({
          name: 'Contacts',
          typename: DataType.Person.typename,
          jsonSchema: Type.toJsonSchema(DataType.Person),
          presentation: project,
          fields: ['fullName'],
        });

        project.collections.push(Ref.make(view));

        space.db.add(view);
        space.db.add(project);

        // Generate random contacts
        const factory = createObjectFactory(space.db, faker as any);
        await factory([{ type: DataType.Person, count: 12 }]);
      },
    }),
    withLayout({ fullscreen: true }),
    withTheme,
  ],
};
