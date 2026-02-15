//
// Copyright 2024 DXOS.org
//

import { RegistryContext } from '@effect-atom/atom-react';
import { type Decorator, type Meta, type StoryObj } from '@storybook/react-vite';
import * as Effect from 'effect/Effect';
import React, { useCallback, useContext } from 'react';
import { expect, waitFor, within } from 'storybook/test';

import { withPluginManager } from '@dxos/app-framework/testing';
import { Obj, type QueryAST, Type } from '@dxos/echo';
import { type Mutable } from '@dxos/echo/internal';
import { invariant } from '@dxos/invariant';
import { ClientPlugin } from '@dxos/plugin-client';
import { PreviewPlugin } from '@dxos/plugin-preview';
import { useGlobalFilteredObjects } from '@dxos/plugin-search';
import { SpacePlugin } from '@dxos/plugin-space';
import { StorybookPlugin, corePlugins } from '@dxos/plugin-testing';
import { faker } from '@dxos/random';
import { Filter, type Space, useQuery, useSchema, useSpaces } from '@dxos/react-client/echo';
import { withTheme() } from '@dxos/react-ui/testing';
import { ViewEditor } from '@dxos/react-ui-form';
import {
  Kanban as KanbanComponent,
  translations as kanbanTranslations,
  useKanbanModel,
  useProjectionModel,
} from '@dxos/react-ui-kanban';
import { Kanban } from '@dxos/react-ui-kanban/types';
import { JsonFilter } from '@dxos/react-ui-syntax-highlighter';
import { View, getTypenameFromQuery } from '@dxos/schema';
import { Organization, Person } from '@dxos/types';

import { translations } from '../translations';

faker.seed(0);

const createOrg = () => ({
  name: faker.commerce.productName(),
  description: faker.lorem.paragraph(),
  image: faker.image.url(),
  website: faker.internet.url(),
  status: faker.helpers.arrayElement(Organization.StatusOptions).id as Organization.Organization['status'],
});

//
// Story setup helpers.
//

type ClientSetupOptions = {
  types?: Type.Entity.Any[];
  onSpaceCreated?: (space: Space) => Promise<void>;
};

/**
 * Creates the standard plugin manager decorator with client configuration.
 */
const withKanbanPlugins = ({ types = [], onSpaceCreated }: ClientSetupOptions): Decorator =>
  withPluginManager({
    plugins: [
      ...corePlugins(),
      ClientPlugin({
        types: [...types, View.View, Kanban.Kanban],
        onClientInitialized: ({ client }) =>
          Effect.gen(function* () {
            yield* Effect.promise(() => client.halo.createIdentity());
            const space = yield* Effect.promise(() => client.spaces.create());
            yield* Effect.promise(() => space.waitUntilReady());
            yield* Effect.promise(() => onSpaceCreated?.(space) ?? Promise.resolve());
          }),
      }),
      PreviewPlugin(),
      SpacePlugin({}),
      StorybookPlugin({}),
    ],
  });

//
// Story components.
//

const DefaultComponent = () => {
  const registry = useContext(RegistryContext);
  const spaces = useSpaces();
  const space = spaces[spaces.length - 1];
  const [object] = useQuery(space?.db, Filter.type(Kanban.Kanban));
  const typename = object?.view.target?.query ? getTypenameFromQuery(object.view.target.query.ast) : undefined;
  const schema = useSchema(space?.db, typename);

  const objects = useQuery(space?.db, schema ? Filter.type(schema) : Filter.nothing());
  const filteredObjects = useGlobalFilteredObjects(objects);

  const projection = useProjectionModel(schema, object, registry);
  const model = useKanbanModel({
    object,
    projection,
    items: filteredObjects,
  });

  const handleAddCard = useCallback(
    (columnValue: string | undefined) => {
      const path = model?.columnFieldPath;
      if (space && schema && Type.isObjectSchema(schema) && path) {
        const card = Obj.make(schema, {
          ...createOrg(),
          [path]: columnValue,
        });

        space.db.add(card);
        return card.id;
      }
    },
    [space, schema, model],
  );

  const handleRemoveCard = useCallback((card: { id: string }) => Obj.isObject(card) && space?.db.remove(card), [space]);

  const handleUpdateQuery = useCallback(
    (newQuery: QueryAST.Query) => {
      invariant(schema);
      invariant(Type.isMutable(schema));
      invariant(object.view.target);

      schema.updateTypename(getTypenameFromQuery(newQuery));
      Obj.change(object.view.target, (v) => {
        v.query.ast = newQuery as Mutable<typeof newQuery>;
      });
    },
    [object, schema],
  );

  const handleDeleteField = useCallback(
    (fieldId: string) => {
      if (schema && Type.isMutable(schema) && projection) {
        projection.deleteFieldProjection(fieldId);
      }
    },
    [schema, projection],
  );

  if (!schema || !object.view.target) {
    return null;
  }

  return (
    <div className='grow grid grid-cols-[1fr_350px] overflow-hidden'>
      {model ? <KanbanComponent model={model} onAddCard={handleAddCard} onRemoveCard={handleRemoveCard} /> : <div />}
      <div className='flex flex-col bs-full overflow-hidden border-l border-separator'>
        <ViewEditor
          classNames='p-2'
          registry={space?.db.schemaRegistry}
          schema={schema}
          view={object.view.target}
          onQueryChanged={handleUpdateQuery}
          onDelete={Type.isMutable(schema) ? handleDeleteField : undefined}
        />
        <JsonFilter data={{ view: object.view.target, schema }} classNames='text-xs' />
      </div>
    </div>
  );
};

//
// Story definitions.
//

const meta = {
  title: 'plugins/plugin-kanban/Kanban',
  component: DefaultComponent,
  render: () => <DefaultComponent />,
  decorators: [withTheme()],
  parameters: {
    layout: 'fullscreen',
    translations: [...translations, ...kanbanTranslations],
  },
} satisfies Meta<typeof DefaultComponent>;

export default meta;

type Story = StoryObj<typeof meta>;

/**
 * Default story using static runtime schema (immutable).
 * Schema mutations are not allowed.
 */
export const Default: Story = {
  decorators: [
    withKanbanPlugins({
      types: [Organization.Organization, Person.Person],
      onSpaceCreated: async (space) => {
        const { view } = await View.makeFromDatabase({
          db: space.db,
          typename: Organization.Organization.typename,
          pivotFieldName: 'status',
        });
        const kanban = Kanban.make({ view });
        space.db.add(kanban);

        // TODO(burdon): Replace with sdk/schema/testing.
        Array.from({ length: 80 }).map(() => {
          return space.db.add(Obj.make(Organization.Organization, createOrg()));
        });
      },
    }),
  ],
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    // Wait for the kanban columns to render by finding the status tags.
    // Organization.StatusOptions: prospect, qualified, active, commit, reject.
    const activeTag = await canvas.findByText('Active', undefined, { timeout: 30_000 });
    const prospectTag = await canvas.findByText('Prospect', undefined, { timeout: 10_000 });
    const commitTag = await canvas.findByText('Commit', undefined, { timeout: 10_000 });

    // Verify all expected columns are rendered.
    await expect(activeTag).toBeTruthy();
    await expect(prospectTag).toBeTruthy();
    await expect(commitTag).toBeTruthy();

    // Find the column containers.
    const activeColumn = activeTag.closest('[data-dx-stack-item]') as HTMLElement;
    const prospectColumn = prospectTag.closest('[data-dx-stack-item]') as HTMLElement;
    await expect(activeColumn).toBeTruthy();
    await expect(prospectColumn).toBeTruthy();

    // Wait for cards to render in the columns.
    // Cards have data-dx-item-id attribute from StackItem.Root.
    const getColumnCards = (column: HTMLElement) =>
      Array.from(column.querySelectorAll('[data-dx-item-id]')) as HTMLElement[];

    await waitFor(() => expect(getColumnCards(activeColumn).length).toBeGreaterThan(0));

    // Verify cards are distributed across columns.
    const activeCards = getColumnCards(activeColumn);
    const prospectCards = getColumnCards(prospectColumn);
    await expect(activeCards.length).toBeGreaterThan(0);
    await expect(prospectCards.length).toBeGreaterThan(0);

    // Verify cards have drag handles (first button in toolbar).
    const firstActiveCard = activeCards[0];
    const buttons = firstActiveCard.querySelectorAll('button');
    await expect(buttons.length).toBeGreaterThan(0);

    // Verify the drop zone exists in each column.
    const activeDropZone = activeColumn.querySelector('.kanban-drop');
    const prospectDropZone = prospectColumn.querySelector('.kanban-drop');
    await expect(activeDropZone).toBeTruthy();
    await expect(prospectDropZone).toBeTruthy();

    // TODO(wittjosiah): Get drag & drop tests working.
    //   See packages/apps/composer-app/src/playwright/stack.spec.ts for reference.
  },
};

/**
 * Story variant that uses a mutable database schema (EchoSchema).
 * This allows testing schema mutations like adding/removing fields.
 */
// TODO(wittjosiah): Card previews (e.g., OrganizationCard) are type-specific and hard-coded.
//   They don't use the projection to determine which fields to display, so deleting a field
//   from the schema won't remove it from the card preview. To fix this, the type-specific
//   cards in PreviewPlugin would need to accept and respect the projection prop.
export const MutableSchema: Story = {
  decorators: [
    withKanbanPlugins({
      onSpaceCreated: async (space) => {
        // Register schema in the database to make it mutable (EchoSchema).
        const [schema] = await space.db.schemaRegistry.register([Organization.Organization]);

        const { view } = await View.makeFromDatabase({
          db: space.db,
          typename: schema.typename,
          pivotFieldName: 'status',
        });
        const kanban = Kanban.make({ view });
        space.db.add(kanban);

        // Create test data using the registered schema.
        Array.from({ length: 80 }).map(() => {
          return space.db.add(Obj.make(schema, createOrg()));
        });
      },
    }),
  ],
};
