//
// Copyright 2025 DXOS.org
//

import '@dxos-theme';

import { type StoryObj, type Meta } from '@storybook/react-vite';
import { Schema } from 'effect';
import React, { useCallback, useMemo, useRef } from 'react';

import { Type } from '@dxos/echo';
import { FormatEnum, isMutable, toJsonSchema, EchoObject, GeneratorAnnotation } from '@dxos/echo-schema';
import { invariant } from '@dxos/invariant';
import { useGlobalFilteredObjects } from '@dxos/plugin-search';
import { faker } from '@dxos/random';
import { useClient } from '@dxos/react-client';
import { Filter, useQuery, useSchema, live, fullyQualifiedId } from '@dxos/react-client/echo';
import { useClientProvider, withClientProvider } from '@dxos/react-client/testing';
import { ViewEditor } from '@dxos/react-ui-form';
import { SyntaxHighlighter } from '@dxos/react-ui-syntax-highlighter';
import { getSchemaFromPropertyDefinitions, DataType, ProjectionManager } from '@dxos/schema';
import { Testing, createObjectFactory } from '@dxos/schema/testing';
import { withLayout, withTheme } from '@dxos/storybook-utils';

import { Table, type TableController } from './Table';
import { useTableModel, useAddRow } from '../../hooks';
import { TablePresentation } from '../../model';
import { translations } from '../../translations';
import { initializeProjection } from '../../util';
import { TableToolbar } from '../TableToolbar';

faker.seed(0); // NOTE(ZaymonFC): Required for smoke tests.

/**
 * Custom hook to create and manage a test table model for storybook demonstrations.
 * Provides table data, schema, and handlers for table operations.
 */
const useTestTableModel = () => {
  const client = useClient();
  const { space } = useClientProvider();

  const projections = useQuery(space, Filter.type(DataType.Projection));
  const projection = useMemo(() => projections.at(0), [projections]);
  const schema = useSchema(client, space, projection?.query.typename);

  const manager = useMemo(() => {
    if (schema && projection) {
      return new ProjectionManager(toJsonSchema(schema), projection);
    }
  }, [schema, projection]);

  const features = useMemo(
    () => ({
      selection: { enabled: true, mode: 'multiple' as const },
      dataEditable: true,
      schemaEditable: schema && isMutable(schema),
    }),
    [schema],
  );

  const objects = useQuery(space, schema ? Filter.type(schema) : Filter.nothing());
  const filteredObjects = useGlobalFilteredObjects(objects);

  const tableRef = useRef<TableController>(null);
  const handleCellUpdate = useCallback((cell: any) => {
    tableRef.current?.update?.(cell);
  }, []);

  const handleRowOrderChange = useCallback(() => {
    tableRef.current?.update?.();
  }, []);

  const addRow = useAddRow({ space, schema });

  const handleDeleteRows = useCallback(
    (_: number, objects: any[]) => {
      for (const object of objects) {
        space?.db.remove(object);
      }
    },
    [space],
  );

  const handleDeleteColumn = useCallback(
    (fieldId: string) => {
      if (manager) {
        manager.deleteFieldProjection(fieldId);
      }
    },
    [projection],
  );

  const model = useTableModel({
    id: projection ? fullyQualifiedId(projection) : undefined,
    projection: manager,
    features,
    rows: filteredObjects,
    onInsertRow: addRow,
    onDeleteRows: handleDeleteRows,
    onDeleteColumn: handleDeleteColumn,
    onCellUpdate: handleCellUpdate,
    onRowOrderChange: handleRowOrderChange,
  });

  const handleInsertRow = useCallback(() => {
    model?.insertRow();
  }, [model]);

  const handleSaveView = useCallback(() => {
    model?.saveView();
  }, [model]);

  const presentation = useMemo(() => {
    if (model) {
      return new TablePresentation(model);
    }
  }, [model]);

  return {
    schema,
    projection,
    tableRef,
    model,
    presentation,
    space,
    client,
    handleInsertRow,
    handleSaveView,
    handleDeleteRows,
    handleDeleteColumn,
  };
};

const StoryViewEditor = () => {
  const { projection, space, schema, handleDeleteColumn } = useTestTableModel();

  const handleTypenameChanged = useCallback(
    (typename: string) => {
      invariant(schema);
      invariant(Type.isMutable(schema));
      schema.updateTypename(typename);
      invariant(projection);
      projection.query.typename = typename;
    },
    [schema, projection],
  );

  if (!projection || !schema) {
    return null;
  }

  return (
    <ViewEditor
      registry={space?.db.schemaRegistry}
      schema={schema}
      projection={projection}
      onTypenameChanged={handleTypenameChanged}
      onDelete={handleDeleteColumn}
    />
  );
};

//
// Story components.
//

const DefaultStory = () => {
  const { schema, projection, tableRef, model, presentation, client, handleInsertRow, handleSaveView } =
    useTestTableModel();

  if (!schema || !projection) {
    return <div />;
  }

  return (
    <div className='grow grid grid-cols-[1fr_350px]'>
      <div className='grid grid-rows-[min-content_1fr] min-bs-0 overflow-hidden'>
        <TableToolbar classNames='border-be border-subduedSeparator' onAdd={handleInsertRow} onSave={handleSaveView} />
        <Table.Root>
          <Table.Main
            ref={tableRef}
            model={model}
            presentation={presentation}
            schema={schema}
            client={client}
            ignoreAttention
          />
        </Table.Root>
      </div>
      <div className='flex flex-col h-full border-l border-separator overflow-y-auto'>
        <StoryViewEditor />
        <SyntaxHighlighter language='json' className='w-full text-xs'>
          {JSON.stringify({ projection, schema }, null, 2)}
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

const meta: Meta<StoryProps> = {
  title: 'ui/react-ui-table/Table',
  render: DefaultStory,
  parameters: {
    translations,
    layout: 'fullscreen',
    controls: {
      disable: true,
    },
  },
  decorators: [
    withTheme,
    withLayout({ fullscreen: true }),
    withClientProvider({
      types: [DataType.Projection],
      createIdentity: true,
      createSpace: true,
      onSpaceCreated: async ({ space }) => {
        const { schema, projection } = await initializeProjection({ space, initialRow: false });
        space.db.add(projection);
        Array.from({ length: 10 }).map(() => {
          return space.db.add(
            live(schema, {
              name: faker.person.fullName(),
            }),
          );
        });
      },
    }),
  ],
};

export default meta;

export const Default = {};

export const StaticSchema: StoryObj = {
  render: DefaultStory,
  parameters: { translations },
  decorators: [
    withClientProvider({
      types: [DataType.Projection, Testing.Contact, Testing.Organization],
      createIdentity: true,
      createSpace: true,
      onSpaceCreated: async ({ space }) => {
        const { projection } = await initializeProjection({ space, initialRow: false });
        space.db.add(projection);

        const factory = createObjectFactory(space.db, faker as any);
        await factory([
          // { type: Testing.Contact, count: 10 },
          // { type: Testing.Organization, count: 1 },
          { type: ContactWithArrayOfEmails, count: 10 },
        ]);
      },
    }),
    withLayout({ fullscreen: true }),
    withTheme,
  ],
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
  parameters: { translations },
  decorators: [
    withClientProvider({
      types: [DataType.Projection, Testing.Contact, Testing.Organization, ContactWithArrayOfEmails],
      createIdentity: true,
      createSpace: true,
      onSpaceCreated: async ({ space }) => {
        const { projection } = await initializeProjection({ space, typename: ContactWithArrayOfEmails.typename });
        space.db.add(projection);

        const factory = createObjectFactory(space.db, faker as any);
        await factory([
          // { type: Testing.Contact, count: 10 },
          // { type: Testing.Organization, count: 1 },
          { type: ContactWithArrayOfEmails, count: 10 },
        ]);
      },
    }),
    withLayout({ fullscreen: true }),
    withTheme,
  ],
};

export const Tags: Meta<StoryProps> = {
  title: 'ui/react-ui-table/Table',
  render: DefaultStory,
  parameters: { translations },
  decorators: [
    withClientProvider({
      types: [DataType.Projection],
      createIdentity: true,
      createSpace: true,
      onSpaceCreated: async ({ client, space }) => {
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
        const { projection } = await initializeProjection({ space, initialRow: false, typename });
        space.db.add(projection);

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
    withLayout({ fullscreen: true }),
    withTheme,
  ],
};
