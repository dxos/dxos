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
import { Testing, createObjectFactory } from '@dxos/schema/testing';
import { withLayout, withTheme } from '@dxos/storybook-utils';

import { Project } from './Project';

const StorybookProjectItem = ({ item }: { item: Obj.Any }) => {
  if (Obj.instanceOf(Testing.Contact, item)) {
    const contact = item as Obj.Obj<Testing.Contact>;
    return <Form values={contact} schema={Testing.ContactSchema} autoSave />;
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
          jsonSchema: Type.toJsonSchema(Testing.ContactSchema),
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
