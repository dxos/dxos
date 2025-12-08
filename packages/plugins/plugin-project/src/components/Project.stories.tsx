//
// Copyright 2025 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useCallback, useEffect } from 'react';

import { Filter, Ref } from '@dxos/client/echo';
import { Obj, Query, Type } from '@dxos/echo';
import { faker } from '@dxos/random';
import { useQuery } from '@dxos/react-client/echo';
import { useClientProvider, withClientProvider } from '@dxos/react-client/testing';
import { withTheme } from '@dxos/react-ui/testing';
import { Form, omitId } from '@dxos/react-ui-form';
import { Collection, View } from '@dxos/schema';
import { createObjectFactory } from '@dxos/schema/testing';
import { Person, Project } from '@dxos/types';

import { translations } from '../translations';

import { type ItemProps, Project as ProjectComponent } from './Project';

const StorybookProjectItem = ({ item, projectionModel }: ItemProps) => {
  if (Obj.instanceOf(Person.Person, item)) {
    const contact = item as Obj.Obj<Person.Person>;

    return (
      <Form.Root schema={omitId(Person.Person)} projection={projectionModel} values={contact} autoSave>
        <Form.Viewport>
          <Form.Content>
            <Form.FieldSet />
          </Form.Content>
        </Form.Viewport>
      </Form.Root>
    );
  }

  return <span>{item.id}</span>;
};

const DefaultStory = () => {
  const { space } = useClientProvider();
  const projects = useQuery(space?.db, Filter.type(Project.Project));
  const project = projects[0];

  const handleAddColumn = useCallback(() => {
    if (!space || !project) {
      return;
    }

    // Create a new view for contacts similar to the initialization
    const view = View.make({
      query: Query.select(Filter.type(Person.Person)),
      jsonSchema: Type.toJsonSchema(Person.Person),
      fields: ['fullName'],
    });

    project.columns.push({
      name: 'New Contacts',
      view: Ref.make(view),
      order: [],
    });

    return Ref.make(view);
  }, [space, project]);

  if (!project) {
    return <p>Loading…</p>;
  }

  return (
    <ProjectComponent.Root Item={StorybookProjectItem} onAddColumn={handleAddColumn}>
      <ProjectComponent.Content project={project} />
    </ProjectComponent.Root>
  );
};

const MutationsStory = () => {
  const { space } = useClientProvider();
  const projects = useQuery(space?.db, Filter.type(Project.Project));
  const contacts = useQuery(space?.db, Filter.type(Person.Person));
  const project = projects[0];

  const handleAddColumn = useCallback(() => {
    if (!space || !project) {
      return;
    }

    // Create a new view for contacts similar to the initialization.
    const view = View.make({
      query: Query.select(Filter.type(Person.Person)),
      jsonSchema: Type.toJsonSchema(Person.Person),
      fields: ['fullName'],
    });

    project.columns.push({
      name: 'New Contacts',
      view: Ref.make(view),
      order: [],
    });

    return view;
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
        void factory([{ type: Person.Person, count: 1 }]);
      }
    }, 3_000);

    return () => clearInterval(interval);
  }, [space, project, contacts]);

  if (!project) {
    return <p>Loading…</p>;
  }

  return (
    <ProjectComponent.Root Item={StorybookProjectItem} onAddColumn={handleAddColumn}>
      <ProjectComponent.Content project={project} />
    </ProjectComponent.Root>
  );
};

const meta = {
  title: 'plugins/plugin-project/Project',
  decorators: [
    withTheme,
    withClientProvider({
      types: [Project.Project, View.View, Collection.Collection, Person.Person],
      createIdentity: true,
      createSpace: true,
      onCreateSpace: async ({ space }) => {
        // Create a project.
        const project = Project.make();

        // Create a view for contacts.
        const view = View.make({
          name: 'Contacts',
          query: Query.select(Filter.type(Person.Person)),
          jsonSchema: Type.toJsonSchema(Person.Person),
          fields: ['fullName'],
        });

        project.columns.push({
          name: 'Contacts',
          view: Ref.make(view),
          order: [],
        });

        space.db.add(project);

        // Generate random contacts
        const factory = createObjectFactory(space.db, faker as any);
        await factory([{ type: Person.Person, count: 12 }]);
      },
    }),
  ],
  parameters: {
    layout: 'fullscreen',
    translations,
  },
} satisfies Meta<typeof Project>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: DefaultStory,
};

export const Mutations: Story = {
  render: MutationsStory,
};
