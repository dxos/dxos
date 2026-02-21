//
// Copyright 2025 DXOS.org
//

import { RegistryContext } from '@effect-atom/atom-react';
import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useCallback, useContext, useEffect } from 'react';

import { Filter, Ref } from '@dxos/client/echo';
import { Obj, Query, Type } from '@dxos/echo';
import { faker } from '@dxos/random';
import { useQuery } from '@dxos/react-client/echo';
import { useClientStory, withClientProvider } from '@dxos/react-client/testing';
import { withLayout, withTheme } from '@dxos/react-ui/testing';
import { Form, omitId } from '@dxos/react-ui-form';
import { withMosaic } from '@dxos/react-ui-mosaic/testing';
import { Collection, View } from '@dxos/schema';
import { createObjectFactory } from '@dxos/schema/testing';
import { withRegistry } from '@dxos/storybook-utils';
import { Person, Pipeline } from '@dxos/types';

import { translations } from '../translations';

import { type ItemProps, PipelineComponent, usePipelineBoardModel } from './PipelineComponent';

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
  const registry = useContext(RegistryContext);
  const { space } = useClientStory();
  const pipelines = useQuery(space?.db, Filter.type(Pipeline.Pipeline));
  const pipeline = pipelines[0];
  const model = usePipelineBoardModel(pipeline, registry);

  const handleAddColumn = useCallback(() => {
    if (!space || !pipeline) {
      return;
    }

    // Create a new view for contacts similar to the initialization.
    const view = View.make({
      query: Query.select(Filter.type(Person.Person)),
      jsonSchema: Type.toJsonSchema(Person.Person),
      fields: ['fullName'],
    });

    Obj.change(pipeline, (p) => {
      p.columns.push({
        name: 'New Contacts',
        view: Ref.make(view) as (typeof p.columns)[number]['view'],
        order: [],
      });
    });

    return Ref.make(view);
  }, [space, pipeline]);

  if (!pipeline) {
    return <p>Loading…</p>;
  }

  return (
    <PipelineComponent.Root Item={StorybookProjectItem} model={model} onAddColumn={handleAddColumn}>
      <PipelineComponent.Content pipeline={pipeline} />
    </PipelineComponent.Root>
  );
};

const MutationsStory = () => {
  const registry = useContext(RegistryContext);
  const { space } = useClientStory();
  const pipelines = useQuery(space?.db, Filter.type(Pipeline.Pipeline));
  const contacts = useQuery(space?.db, Filter.type(Person.Person));
  const pipeline = pipelines[0];
  const model = usePipelineBoardModel(pipeline, registry);

  const handleAddColumn = useCallback(() => {
    if (!space || !pipeline) {
      return;
    }

    // Create a new view for contacts similar to the initialization.
    const view = View.make({
      query: Query.select(Filter.type(Person.Person)),
      jsonSchema: Type.toJsonSchema(Person.Person),
      fields: ['fullName'],
    });

    Obj.change(pipeline, (p) => {
      p.columns.push({
        name: 'New Contacts',
        view: Ref.make(view) as (typeof p.columns)[number]['view'],
        order: [],
      });
    });

    return view;
  }, [space, pipeline]);

  useEffect(() => {
    if (!space || !pipeline) {
      return;
    }

    const interval = setInterval(() => {
      const factory = createObjectFactory(space.db, faker as any);
      const p = Math.random();

      if (p < 0.4) {
        // Append to the name
        const contactToAdjust = faker.helpers.arrayElement(contacts);
        Obj.change(contactToAdjust, (c) => {
          c.fullName = (c.fullName ?? '') + ' X';
        });
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
  }, [space, pipeline, contacts]);

  if (!pipeline) {
    return <p>Loading…</p>;
  }

  return (
    <PipelineComponent.Root Item={StorybookProjectItem} model={model} onAddColumn={handleAddColumn}>
      <PipelineComponent.Content pipeline={pipeline} />
    </PipelineComponent.Root>
  );
};

const meta = {
  title: 'plugins/plugin-pipeline/PipelineComponent',
  decorators: [
    withTheme(),
    withLayout({ layout: 'column' }),
    withRegistry,
    withMosaic(),
    withClientProvider({
      types: [Pipeline.Pipeline, View.View, Collection.Collection, Person.Person],
      createIdentity: true,
      createSpace: true,
      onCreateSpace: async ({ space }) => {
        // Create a view for contacts.
        const view = View.make({
          name: 'Contacts',
          query: Query.select(Filter.type(Person.Person)),
          jsonSchema: Type.toJsonSchema(Person.Person),
          fields: ['fullName'],
        });

        // Create a pipeline with columns.
        space.db.add(
          Pipeline.make({
            columns: [
              {
                name: 'Contacts',
                view: Ref.make(view),
                order: [],
              },
            ],
          }),
        );

        // Generate random contacts.
        const factory = createObjectFactory(space.db, faker as any);
        await factory([{ type: Person.Person, count: 12 }]);
      },
    }),
  ],
  parameters: {
    layout: 'fullscreen',
    translations,
  },
} satisfies Meta<typeof PipelineComponent>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: DefaultStory,
};

export const Mutations: Story = {
  render: MutationsStory,
};
