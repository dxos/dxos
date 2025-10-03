//
// Copyright 2025 DXOS.org
//

import '@dxos-theme';

import { type Meta, type StoryObj } from '@storybook/react-vite';
import type { Schema } from 'effect';
import React, { useCallback, useEffect } from 'react';

import { Filter, Ref, type Space } from '@dxos/client/echo';
import { Obj, Query, Type } from '@dxos/echo';
import { faker } from '@dxos/random';
import { useQuery } from '@dxos/react-client/echo';
import { useClientProvider, withClientProvider } from '@dxos/react-client/testing';
import { Form } from '@dxos/react-ui-form';
import { DataType, createView } from '@dxos/schema';
import { createObjectFactory, createReactiveObject } from '@dxos/schema/testing';
import { withLayout, withTheme } from '@dxos/storybook-utils';

import { translations } from '../translations';

import { type ItemProps, Project } from './Project';

const StorybookProjectItem = ({ item, projectionModel }: ItemProps) => {
  if (Obj.instanceOf(DataType.Person, item)) {
    const contact = item as Obj.Obj<DataType.Person>;
    return <Form values={contact} schema={DataType.Person} projection={projectionModel} autoSave />;
  }
  return <span>{item.id}</span>;
};

const useStorybookAddItem = (space?: Space) => {
  return useCallback(
    (schema: Schema.Schema.AnyNoContext) => {
      if (!space || !schema) {
        return;
      }
      space.db.add(createReactiveObject(schema)({}));
    },
    [space],
  );
};

const DefaultStory = () => {
  const { space } = useClientProvider();
  const projects = useQuery(space, Filter.typename(DataType.Project.typename));
  const project = projects[0];

  const handleAddItem = useStorybookAddItem(space);

  const handleAddColumn = useCallback(() => {
    if (!space || !project) {
      return;
    }

    // Create a new view for contacts similar to the initialization
    const view = createView({
      name: 'New Contacts',
      query: Query.select(Filter.type(DataType.Person)),
      jsonSchema: Type.toJsonSchema(DataType.Person),
      presentation: project,
      fields: ['fullName'],
    });

    space.db.add(view);
    project.collections.push(Ref.make(view));

    return Ref.make(view);
  }, [space, project]);

  if (!project) {
    return <p>Loading…</p>;
  }

  return (
    <Project.Root Item={StorybookProjectItem} onAddItem={handleAddItem} onAddColumn={handleAddColumn}>
      <Project.Content project={project} />
    </Project.Root>
  );
};

const MutationsStory = () => {
  const { space } = useClientProvider();
  const projects = useQuery(space, Filter.typename(DataType.Project.typename));
  const contacts = useQuery(space, Filter.typename(DataType.Person.typename));
  const project = projects[0];

  const handleAddItem = useStorybookAddItem(space);

  const handleAddColumn = useCallback(() => {
    if (!space || !project) {
      return;
    }

    // Create a new view for contacts similar to the initialization
    const view = createView({
      name: 'New Contacts',
      query: Query.select(Filter.type(DataType.Person)),
      jsonSchema: Type.toJsonSchema(DataType.Person),
      presentation: project,
      fields: ['fullName'],
    });

    space.db.add(view);
    return project.collections.push(Ref.make(view));
  }, [space, project]);

  useEffect(() => {
    if (!space || !project) {
      return;
    }

    const interval = setInterval(() => {
      const factory = createObjectFactory(space.db, faker as any);
      const p = Math.random();

      if (p < 0.4) {
        // Append to the name
        const contactToAdjust = faker.helpers.arrayElement(contacts);
        contactToAdjust.fullName += ' X';
        return;
      } else if (p < 0.7 && contacts.length > 1) {
        // Remove a contact (30% chance, but only if we have more than 1)
        const contactToRemove = faker.helpers.arrayElement(contacts);
        space.db.remove(contactToRemove);
      } else {
        // Add a new contact (30% chance)
        void factory([{ type: DataType.Person, count: 1 }]);
      }
    }, 3_000);

    return () => clearInterval(interval);
  }, [space, project, contacts]);

  if (!project) {
    return <p>Loading…</p>;
  }

  return (
    <Project.Root Item={StorybookProjectItem} onAddItem={handleAddItem} onAddColumn={handleAddColumn}>
      <Project.Content project={project} />
    </Project.Root>
  );
};

const meta: Meta<typeof Project> = {
  title: 'plugins/plugin-project/Project',
  parameters: { translations },
  decorators: [
    withClientProvider({
      types: [DataType.Project, DataType.View, DataType.Collection, DataType.Person],
      createIdentity: true,
      createSpace: true,
      onCreateSpace: async ({ space }) => {
        // Create a project
        const project = DataType.makeProject({
          collections: [],
        });

        // Create a view for contacts
        const view = createView({
          name: 'Contacts',
          query: Query.select(Filter.type(DataType.Person)),
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

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: DefaultStory,
};

export const Mutations: Story = {
  render: MutationsStory,
};
