//
// Copyright 2025 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useMemo, useState } from 'react';

import { Obj } from '@dxos/echo';
import { FormatEnum, type JsonSchemaType } from '@dxos/echo-schema';
import { faker } from '@dxos/random';
import { useClient } from '@dxos/react-client';
import { Filter, useQuery, useSchema } from '@dxos/react-client/echo';
import { useClientProvider, withClientProvider } from '@dxos/react-client/testing';
import { withTheme } from '@dxos/react-ui/testing';
import { type SchemaPropertyDefinition } from '@dxos/schema';
import { Testing } from '@dxos/schema/testing';

import { type TableFeatures } from '../../model';
import { translations } from '../../translations';

import { DynamicTable } from './DynamicTable';

faker.seed(0);

const useTestPropertiesAndObjects = () => {
  const properties = useMemo<SchemaPropertyDefinition[]>(
    () => [
      { name: 'name', format: FormatEnum.String },
      { name: 'age', format: FormatEnum.Number },
    ],
    [],
  );

  const [rows] = useState<any[]>(
    Array.from({ length: 10 }, () => ({
      id: faker.string.uuid(),
      name: faker.person.fullName(),
      age: faker.number.int({ min: 18, max: 80 }),
    })),
  );

  return { properties, rows };
};

//
// Story components.
//

const DynamicTableStory = () => {
  const { properties, rows } = useTestPropertiesAndObjects();
  return <DynamicTable properties={properties} rows={rows} />;
};

//
// Story definitions.
//

const meta = {
  title: 'ui/react-ui-table/DynamicTable',
  component: DynamicTable,
  decorators: [withTheme],
  parameters: {
    layout: 'fullscreen',
    translations,
  },
} satisfies Meta<typeof DynamicTable>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: StoryObj = {
  render: DynamicTableStory,
};

export const WithRowClicks: StoryObj = {
  render: () => {
    const { properties, rows } = useTestPropertiesAndObjects();

    const handleRowClicked = (row: any) => {
      console.log('Row clicked:', row);
      alert(`Row clicked: ${row.name}, age: ${row.age}`);
    };

    return <DynamicTable properties={properties} rows={rows} onRowClick={handleRowClicked} />;
  },
};

export const WithClickToSelect: StoryObj = {
  render: () => {
    const { properties, rows } = useTestPropertiesAndObjects();

    const features = useMemo<Partial<TableFeatures>>(
      () => ({ selection: { enabled: true, mode: 'single' as const }, dataEditable: false }),
      [],
    );

    return <DynamicTable properties={properties} rows={rows} features={features} />;
  },
};

export const WithJsonSchema: StoryObj = {
  render: () => {
    const schema = useMemo<JsonSchemaType>(
      () => ({
        type: 'object',
        properties: {
          name: { type: 'string', title: 'Full Name' },
          age: { type: 'number', title: 'Age (Years)' },
          email: { type: 'string', format: 'email', title: 'Email Address' },
          active: { type: 'boolean', title: 'Active Status' },
        },
        required: ['name', 'email'],
      }),
      [],
    );

    const [rows] = useState<any[]>(
      Array.from({ length: 15 }, () => ({
        name: faker.person.fullName(),
        age: faker.number.int({ min: 18, max: 80 }),
        email: faker.internet.email(),
        active: faker.datatype.boolean(),
      })),
    );

    return <DynamicTable jsonSchema={schema} rows={rows} />;
  },
};

export const WithEchoSchema: StoryObj = {
  render: () => {
    const client = useClient();
    const { space } = useClientProvider();
    const schema = useSchema(client, space, Testing.Contact.typename);
    const objects = useQuery(space, schema ? Filter.type(schema) : Filter.nothing());
    if (!schema) {
      return <div>Loading schema...</div>;
    }

    return <DynamicTable schema={schema} rows={objects} />;
  },
  decorators: [
    withClientProvider({
      types: [Testing.Contact],
      createIdentity: true,
      createSpace: true,
      onCreateSpace: async ({ space }) => {
        Array.from({ length: 10 }).forEach(() => {
          space.db.add(
            Obj.make(Testing.Contact, {
              name: faker.person.fullName(),
              email: faker.internet.email(),
            }),
          );
        });
      },
    }),
  ],
};
