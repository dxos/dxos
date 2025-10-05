//
// Copyright 2025 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import { Schema } from 'effect';
import React, { useCallback } from 'react';

import { Filter, Obj, Query, Type } from '@dxos/echo';
import {
  EchoObject,
  FormatAnnotation,
  FormatEnum,
  GeneratorAnnotation,
  LabelAnnotation,
  PropertyMetaAnnotationId,
} from '@dxos/echo-schema';
import { invariant } from '@dxos/invariant';
import { faker } from '@dxos/random';
import { PublicKey } from '@dxos/react-client';
import { type Space, live } from '@dxos/react-client/echo';
import { withClientProvider } from '@dxos/react-client/testing';
import { ViewEditor } from '@dxos/react-ui-form';
import { SyntaxHighlighter } from '@dxos/react-ui-syntax-highlighter';
import { DataType, getSchemaFromPropertyDefinitions } from '@dxos/schema';
import { Testing, createObjectFactory } from '@dxos/schema/testing';

import { useTestTableModel } from '../../testing';
import { translations } from '../../translations';
import { Table } from '../../types';
import { TableToolbar } from '../TableToolbar';

import { Table as TableComponent } from './Table';

const TestSchema = Schema.Struct({
  // TODO(wittjosiah): Should be title. Currently name to work with default label.
  name: Schema.optional(Schema.String).annotations({ title: 'Title' }),
  urgent: Schema.optional(Schema.Boolean).annotations({ title: 'Urgent' }),
  status: Schema.optional(
    Schema.Literal('todo', 'in-progress', 'done')
      .pipe(FormatAnnotation.set(FormatEnum.SingleSelect))
      .annotations({
        title: 'Status',
        [PropertyMetaAnnotationId]: {
          singleSelect: {
            options: [
              { id: 'todo', title: 'Todo', color: 'indigo' },
              { id: 'in-progress', title: 'In Progress', color: 'purple' },
              { id: 'done', title: 'Done', color: 'amber' },
            ],
          },
        },
      }),
  ),
  description: Schema.optional(Schema.String).annotations({ title: 'Description' }),
  parent: Schema.optional(Schema.suspend((): Type.Ref<TestSchema> => Type.Ref(TestSchema))).annotations({
    title: 'Parent',
  }),
}).pipe(
  Type.Obj({ typename: `example.com/type/${PublicKey.random().truncate()}`, version: '0.1.0' }),
  LabelAnnotation.set(['name']),
);
interface TestSchema extends Schema.Schema.Type<typeof TestSchema> {}

const StoryViewEditor = ({
  view,
  schema,
  space,
  handleDeleteColumn,
}: {
  view?: DataType.View;
  schema?: Schema.Schema.AnyNoContext;
  space?: Space;
  handleDeleteColumn: (fieldId: string) => void;
}) => {
  const handleQueryChanged = useCallback(
    (typename: string) => {
      invariant(schema);
      invariant(Type.isMutable(schema));
      schema.updateTypename(typename);
      invariant(view);
      view.query = Query.select(Filter.typename(typename)).ast;
    },
    [schema, view],
  );

  if (!view || !schema) {
    return null;
  }

  return (
    <ViewEditor
      registry={space?.db.schemaRegistry}
      schema={schema}
      view={view}
      onQueryChanged={handleQueryChanged}
      onDelete={handleDeleteColumn}
    />
  );
};

//
// Story components.
//

const DefaultStory = () => {
  const {
    space,
    schema,
    view,
    tableRef,
    model,
    presentation,
    client,
    handleInsertRow,
    handleSaveView,
    handleDeleteColumn,
  } = useTestTableModel();

  if (!schema || !view) {
    return <div />;
  }

  return (
    <div className='grow grid grid-cols-[1fr_350px]'>
      <div className='grid grid-rows-[min-content_1fr] min-bs-0 overflow-hidden'>
        <TableToolbar classNames='border-be border-subduedSeparator' onAdd={handleInsertRow} onSave={handleSaveView} />
        <TableComponent.Root>
          <TableComponent.Main
            ref={tableRef}
            model={model}
            presentation={presentation}
            schema={schema}
            client={client}
            ignoreAttention
          />
        </TableComponent.Root>
      </div>
      <div className='flex flex-col h-full border-l border-separator overflow-y-auto'>
        <StoryViewEditor view={view} schema={schema} space={space} handleDeleteColumn={handleDeleteColumn} />
        <SyntaxHighlighter language='json' className='text-xs'>
          {JSON.stringify({ view, schema }, null, 2)}
        </SyntaxHighlighter>
      </div>
    </div>
  );
};

type StoryProps = { rows?: number };

//
// Story definitions.
//

// TODO(burdon): Need super simple story.

const meta = {
  title: 'ui/react-ui-table/Table',
  render: DefaultStory,
  decorators: [
    withClientProvider({
      types: [DataType.View, Table.Table],
      createIdentity: true,
      createSpace: true,
      onCreateSpace: async ({ client, space }) => {
        const [schema] = await space.db.schemaRegistry.register([TestSchema]);
        const { view } = await Table.makeView({ client, space, typename: schema.typename });
        view.projection.fields = [
          view.projection.fields.find((field) => field.path === 'name')!,
          ...view.projection.fields.filter((field) => field.path !== 'name'),
        ];

        space.db.add(view);

        Array.from({ length: 10 }).map(() => {
          return space.db.add(
            Obj.make(schema, {
              name: faker.lorem.sentence(),
              status: faker.helpers.arrayElement(['todo', 'in-progress', 'done'] as const),
              description: faker.lorem.paragraph(),
            }),
          );
        });
      },
    }),
  ],
  parameters: {
    layout: 'fullscreen',
    controls: {
      disable: true,
    },
    translations,
  },
} satisfies Meta<typeof TableComponent>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const StaticSchema: StoryObj = {
  render: DefaultStory,
  decorators: [
    withClientProvider({
      types: [DataType.View, Table.Table, Testing.Contact, Testing.Organization],
      createIdentity: true,
      createSpace: true,
      onCreateSpace: async ({ client, space }) => {
        const { view } = await Table.makeView({ client, space, typename: Testing.Contact.typename });
        space.db.add(view);

        const factory = createObjectFactory(space.db, faker as any);
        await factory([
          { type: Testing.Contact, count: 10 },
          // { type: Testing.Organization, count: 1 },
        ]);
      },
    }),
  ],
  parameters: {
    layout: 'fullscreen',
    translations,
  },
};

const ContactWithArrayOfEmails = Schema.Struct({
  name: Schema.String.pipe(GeneratorAnnotation.set('person.fullName')),
  emails: Schema.optional(
    Schema.Array(
      Schema.Struct({
        value: Schema.String,
        label: Schema.String.pipe(Schema.optional),
      }),
    ),
  ),
}).pipe(
  EchoObject({
    typename: 'dxos.org/type/ContactWithArrayOfEmails',
    version: '0.1.0',
  }),
);

export const ArrayOfObjects: StoryObj = {
  render: DefaultStory,
  decorators: [
    withClientProvider({
      types: [DataType.View, Table.Table, Testing.Contact, Testing.Organization, ContactWithArrayOfEmails],
      createIdentity: true,
      createSpace: true,
      onCreateSpace: async ({ client, space }) => {
        const { view } = await Table.makeView({ client, space, typename: ContactWithArrayOfEmails.typename });
        space.db.add(view);

        const factory = createObjectFactory(space.db, faker as any);
        await factory([
          // { type: Testing.Contact, count: 10 },
          // { type: Testing.Organization, count: 1 },
          { type: ContactWithArrayOfEmails, count: 10 },
        ]);
      },
    }),
  ],
  parameters: {
    layout: 'fullscreen',
    translations,
  },
};

export const Tags: Meta<StoryProps> = {
  title: 'ui/react-ui-table/Table',
  render: DefaultStory,
  decorators: [
    withClientProvider({
      types: [DataType.View, Table.Table],
      createIdentity: true,
      createSpace: true,
      onCreateSpace: async ({ client, space }) => {
        // Configure schema.
        const typename = 'example.com/SingleSelect';
        const selectOptions = [
          { id: 'one', title: 'One', color: 'emerald' },
          { id: 'two', title: 'Two', color: 'blue' },
          { id: 'three', title: 'Three', color: 'indigo' },
          { id: 'four', title: 'Four', color: 'red' },
          { id: 'longer_option', title: 'LONGER OPTION', color: 'amber' },
        ];

        const selectOptionIds = selectOptions.map((o) => o.id);

        const schema = getSchemaFromPropertyDefinitions(typename, [
          {
            name: 'single',
            format: FormatEnum.SingleSelect,
            config: { options: selectOptions },
          },
          {
            name: 'multiple',
            format: FormatEnum.MultiSelect,
            config: { options: selectOptions },
          },
        ]);
        const [storedSchema] = await space.db.schemaRegistry.register([schema]);

        // Initialize table.
        const { view } = await Table.makeView({ client, space, typename });
        space.db.add(view);

        // Populate.
        Array.from({ length: 10 }).map(() => {
          return space.db.add(
            live(storedSchema, {
              single: faker.helpers.arrayElement([...selectOptionIds, undefined]),
              multiple: faker.helpers.randomSubset(selectOptionIds),
            }),
          );
        });
      },
    }),
  ],
  parameters: {
    layout: 'fullscreen',
    translations,
  },
};
