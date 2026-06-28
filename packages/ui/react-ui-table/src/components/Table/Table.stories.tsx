//
// Copyright 2025 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import * as Schema from 'effect/Schema';
import React, { useCallback } from 'react';
import { expect, userEvent, waitFor, within } from 'storybook/test';

import { type Database, type QueryAST, DXN, Annotation, Format, Obj, Ref, Type, View } from '@dxos/echo';
import { type Mutable, PropertyMetaAnnotationId } from '@dxos/echo/internal';
import { invariant } from '@dxos/invariant';
import { random } from '@dxos/random';
import { PublicKey } from '@dxos/react-client';
import { withClientProvider } from '@dxos/react-client/testing';
import { Panel, ScrollArea } from '@dxos/react-ui';
import { ViewEditor } from '@dxos/react-ui-form';
import { translations as formTranslations } from '@dxos/react-ui-form/translations';
import { JsonHighlighter } from '@dxos/react-ui-syntax-highlighter';
import { withLayout, withTheme } from '@dxos/react-ui/testing';
import { ViewModel, getSchemaFromPropertyDefinitions } from '@dxos/schema';
import { TestSchema, createObjectFactory } from '@dxos/schema/testing';
import { withRegistry } from '@dxos/storybook-utils';

import { translations } from '#translations';

import { useTestTableModel } from '../../testing';
import { Table } from '../../types';
import { Table as TableComponent } from './Table';

const Example = Schema.Struct({
  // TODO(wittjosiah): Should be title. Currently name to work with default label.
  name: Schema.optional(Schema.String).annotations({ title: 'Title' }),
  urgent: Schema.optional(Schema.Boolean).annotations({ title: 'Urgent' }),
  status: Schema.optional(
    Schema.Literal('todo', 'in-progress', 'done')
      .pipe(Format.FormatAnnotation.set(Format.TypeFormat.SingleSelect))
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
  parent: Schema.optional(Schema.suspend((): Ref.RefSchema<Example> => Ref.Ref(Example))).annotations({
    title: 'Parent',
  }),
}).pipe(
  Annotation.LabelAnnotation.set(['name']),
  // NSID last segment must start with a letter (DXN spec), so prefix the random hex.
  Type.makeObject(DXN.make(`com.example.type.example${PublicKey.random().truncate()}`, '0.1.0')),
);
interface Example extends Type.InstanceType<typeof Example> {}

const StoryViewEditor = ({
  view,
  schema,
  db,
  handleDeleteColumn,
}: {
  view?: View.View;
  schema?: Type.AnyEntity;
  db?: Database.Database;
  handleDeleteColumn: (fieldId: string) => void;
}) => {
  const handleQueryChanged = useCallback(
    (newQuery: QueryAST.Query) => {
      invariant(schema);
      invariant(Type.getDatabase(schema) != null);
      invariant(view);
      Obj.update(view, (view) => {
        view.query.ast = newQuery as Mutable<typeof newQuery>;
      });
    },
    [schema, view],
  );

  if (!view || !schema) {
    return null;
  }

  return (
    <ViewEditor
      registry={db?.graph.registry}
      type={schema}
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
  const { db, schema, table, tableRef, model, presentation, handleInsertRow, handleSaveView, handleDeleteColumn } =
    useTestTableModel();

  const handleRowClick = useCallback(
    (row: any) => {
      if (model?.getDraftRowCount() === 0 && ['frozenRowsEnd', 'fixedEndStart', 'fixedEndEnd'].includes(row?.plane)) {
        handleInsertRow();
      }
    },
    [model, handleInsertRow],
  );

  if (!schema || !table?.view.target) {
    return <div />;
  }

  return (
    <div className='grow grid grid-cols-[1fr_350px]'>
      <TableComponent.Root ref={tableRef}>
        <Panel.Root>
          <Panel.Toolbar asChild>
            <TableComponent.Toolbar
              classNames='border-b border-subdued-separator'
              onAdd={handleInsertRow}
              onSave={handleSaveView}
            />
          </Panel.Toolbar>
          <Panel.Content asChild>
            <TableComponent.Content
              schema={schema}
              model={model}
              presentation={presentation}
              onRowClick={handleRowClick}
              ignoreAttention
            />
          </Panel.Content>
        </Panel.Root>
      </TableComponent.Root>
      <ScrollArea.Root orientation='vertical' classNames='border-l border-separator'>
        <ScrollArea.Viewport>
          <StoryViewEditor view={table.view.target} schema={schema} db={db} handleDeleteColumn={handleDeleteColumn} />
          <JsonHighlighter data={{ view: table.view.target, schema }} classNames='text-xs' />
        </ScrollArea.Viewport>
      </ScrollArea.Root>
    </div>
  );
};

type StoryArgs = { rows?: number };

//
// Story definitions.
//

// TODO(burdon): Need simpler story.

const meta = {
  title: 'ui/react-ui-table/Table',
  render: DefaultStory,
  decorators: [
    withTheme(),
    withLayout({ layout: 'fullscreen' }),
    withRegistry,
    withClientProvider({
      types: [View.View, Table.Table],
      createIdentity: true,
      createSpace: true,
      onCreateSpace: async ({ space }) => {
        const type = await space.db.addType(Example);
        const { view, jsonSchema } = await ViewModel.makeFromDatabase({
          db: space.db,
          typename: Type.getTypename(type),
        });
        const table = Table.make({ view, jsonSchema });
        Obj.update(view, (view) => {
          view.projection.fields = [
            view.projection.fields.find((field) => field.path === 'name')!,
            ...view.projection.fields.filter((field) => field.path !== 'name'),
          ];
        });

        space.db.add(table);

        Array.from({ length: 10 }).map(() => {
          return space.db.add(
            Obj.make(type, {
              name: random.lorem.sentence(),
              status: random.helpers.arrayElement(['todo', 'in-progress', 'done'] as const),
              description: random.lorem.paragraph(),
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
    translations: [...translations, ...formTranslations],
  },
} satisfies Meta<typeof TableComponent>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const StaticSchema: StoryObj = {
  render: DefaultStory,
  decorators: [
    withClientProvider({
      types: [View.View, Table.Table],
      createIdentity: true,
      createSpace: true,
      onCreateSpace: async ({ space }) => {
        const { view, jsonSchema } = await ViewModel.makeFromDatabase({
          db: space.db,
          typename: Type.getTypename(TestSchema.Person),
        });
        const table = Table.make({ view, jsonSchema });
        space.db.add(table);

        const factory = createObjectFactory(space.db, random as any);
        await factory([
          { type: TestSchema.Person, count: 10 },
          // { type: TestSchema.Organization, count: 1 },
        ]);
      },
    }),
  ],
  parameters: {
    layout: 'fullscreen',
    translations: [...translations, ...formTranslations],
  },
};

const ContactWithArrayOfEmails = Schema.Struct({
  name: Schema.String.pipe(Annotation.GeneratorAnnotation.set('person.fullName')),
  emails: Schema.optional(
    Schema.Array(
      Schema.Struct({
        value: Schema.String,
        label: Schema.String.pipe(Schema.optional),
      }),
    ),
  ),
}).pipe(Type.makeObject(DXN.make('org.dxos.type.contactWithArrayOfEmails', '0.1.0')));

export const ArrayOfObjects: StoryObj = {
  render: DefaultStory,
  decorators: [
    withClientProvider({
      types: [View.View, Table.Table, TestSchema.Person, TestSchema.Organization, ContactWithArrayOfEmails],
      createIdentity: true,
      createSpace: true,
      onCreateSpace: async ({ space }) => {
        const { view, jsonSchema } = await ViewModel.makeFromDatabase({
          db: space.db,
          typename: Type.getTypename(ContactWithArrayOfEmails),
        });
        const table = Table.make({ view, jsonSchema });
        space.db.add(table);

        const factory = createObjectFactory(space.db, random as any);
        await factory([
          // { type: TestSchema.Person, count: 10 },
          // { type: TestSchema.Organization, count: 1 },
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

export const RequiredSchema: StoryObj = {
  render: DefaultStory,
  decorators: [
    withClientProvider({
      types: [View.View, Table.Table, TestSchema.Person],
      createIdentity: true,
      createSpace: true,
      onCreateSpace: async ({ space }) => {
        // TestSchema.Person has a required `name: Schema.String` field.
        // No pre-populated rows so the add-row flow is the first interaction.
        const { view, jsonSchema } = await ViewModel.makeFromDatabase({
          db: space.db,
          typename: Type.getTypename(TestSchema.Person),
        });
        const table = Table.make({ view, jsonSchema });
        space.db.add(table);
      },
    }),
  ],
  parameters: {
    layout: 'fullscreen',
    translations: [...translations, ...formTranslations],
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    // 30 s covers ECHO client + space + table creation (the only inherently slow step).
    const addRowButton = await canvas.findByTestId('table.toolbar.add-row', undefined, { timeout: 30_000 });

    // Person.name is required, so db.add throws → useAddRow returns 'draft' →
    // a draft row appears in frozenRowsEnd and focus is set to its first cell.
    await userEvent.click(addRowButton);

    const draftCell = await canvas.findByTestId('frozenRowsEnd.0.0');
    await userEvent.click(draftCell);

    // Open the editor with Enter rather than typing to open — the latter routes the first
    // character into dx-grid's `initialContent` and races the editor mount. The empty value
    // fails validation; the editor must stay open so the value below can be entered.
    await userEvent.keyboard('{Enter}');
    await canvas.findByTestId('grid.cell-editor');

    // The editor is focused (autoFocus); type the required value and commit.
    await userEvent.keyboard('Alice');
    await userEvent.keyboard('{Enter}');

    // The draft row is committed and appears in the grid with the typed value.
    await waitFor(async () => {
      const cell = canvas.getByTestId('grid.0.0');
      const text = cell.querySelector('.dx-grid__cell__content')?.textContent;
      await expect(text).toBe('Alice');
    });
  },
};

export const Tags: Meta<StoryArgs> = {
  title: 'ui/react-ui-table/Table',
  render: DefaultStory,
  decorators: [
    withClientProvider({
      types: [View.View, Table.Table],
      createIdentity: true,
      createSpace: true,
      onCreateSpace: async ({ space }) => {
        // Configure schema.
        const typename = 'com.example.type.singleSelect';
        const selectOptions = [
          { id: 'one', title: 'One', color: 'emerald' },
          { id: 'two', title: 'Two', color: 'blue' },
          { id: 'three', title: 'Three', color: 'indigo' },
          { id: 'four', title: 'Four', color: 'red' },
          { id: 'longer_option', title: 'LONGER OPTION', color: 'amber' },
        ];

        const selectOptionIds = selectOptions.map((o) => o.id);

        const type = getSchemaFromPropertyDefinitions(typename, [
          {
            name: 'single',
            format: Format.TypeFormat.SingleSelect,
            config: { options: selectOptions },
          },
          {
            name: 'multiple',
            format: Format.TypeFormat.MultiSelect,
            config: { options: selectOptions },
          },
        ]);
        const storedType = await space.db.addType(type);

        // Initialize table.
        const { view, jsonSchema } = await ViewModel.makeFromDatabase({ db: space.db, typename });
        const table = Table.make({ view, jsonSchema });
        space.db.add(table);

        // Populate.
        Array.from({ length: 10 }).map(() => {
          return space.db.add(
            Obj.make(Type.assertObject(storedType), {
              single: random.helpers.arrayElement([...selectOptionIds, undefined]),
              multiple: random.helpers.randomSubset(selectOptionIds),
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
