//
// Copyright 2024 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import * as Schema from 'effect/Schema';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { DXN, EchoURI, Filter, JsonSchema, Obj, Query, type QueryAST, Tag, Type, type View } from '@dxos/echo';
import { Format, type Mutable } from '@dxos/echo/internal';
import { useQuery } from '@dxos/react-client/echo';
import { useClientStory, withClientProvider } from '@dxos/react-client/testing';
import { useAsyncEffect } from '@dxos/react-ui';
import { withLayout, withTheme } from '@dxos/react-ui/testing';
import { type ProjectionModel, ViewModel, getTypenameFromQuery } from '@dxos/schema';
import { Employer, Organization, Person, Pipeline } from '@dxos/types';

import { translations } from '#translations';

import { TestLayout, VIEW_EDITOR_DEBUG_SYMBOL } from '../testing';
import { ViewEditor, type ViewEditorProps } from './ViewEditor';

const types = [
  // TODO(burdon): Get label from annotation.
  { value: Type.getTypename(Organization.Organization), label: 'Organization' },
  { value: Type.getTypename(Person.Person), label: 'Person' },
  { value: Type.getTypename(Pipeline.Pipeline), label: 'Project' },
  { value: Type.getTypename(Employer.Employer), label: 'Employer' },
];

// Type definition for debug objects exposed to tests.
export type ViewEditorDebugObjects = {
  schema: Type.AnyEntity;
  view: View.View;
  projection: ProjectionModel;
};

type DefaultStoryProps = Pick<ViewEditorProps, 'readonly' | 'mode'>;

const DefaultStory = (props: DefaultStoryProps) => {
  const { space } = useClientStory();
  const [schema, setSchema] = useState<Type.AnyEntity>();
  const [view, setView] = useState<View.View>();
  const projectionRef = useRef<ProjectionModel>(null);

  const tags = useQuery(space?.db, Filter.type(Tag.Tag));

  useAsyncEffect(async () => {
    if (space) {
      const TestSchema = Schema.Struct({
        name: Schema.String,
        email: Format.Email,
        salary: Format.Currency(),
      }).pipe(Type.makeObject(DXN.make('com.example.type.test', '0.1.0')));

      const AlternateSchema = Schema.Struct({
        title: Schema.String,
        description: Schema.String,
        completed: Schema.Boolean,
      }).pipe(Type.makeObject(DXN.make('com.example.type.alternate', '0.1.0')));

      const [testSchema] = await space.db.registry.register([TestSchema, AlternateSchema]);
      const view = ViewModel.make({
        name: 'Test',
        query: Query.select(Filter.type(TestSchema)),
        jsonSchema: JsonSchema.toJsonSchema(TestSchema),
      });

      setSchema(testSchema);
      setView(view);
    }
  }, [space]);

  const updateViewQuery = useCallback(
    async (newQuery: QueryAST.Query, target?: EchoURI.EchoURI) => {
      if (!schema || !view || !space) {
        return;
      }

      if (props.mode === 'tag') {
        const queue = target;
        const query = queue
          ? Query.fromAst(newQuery).from([{ _tag: 'feed' as const, feedUri: `dxn:queue:data:${EchoURI.getSpaceId(queue)}:${EchoURI.getObjectId(queue)}` }])
          : Query.fromAst(newQuery);
        Obj.update(view, (view) => {
          view.query.ast = query.ast as Mutable<typeof query.ast>;
        });

        const typename = getTypenameFromQuery(query.ast);
        const newSchema = space.db.graph.registry.types.find((t) => Type.getTypename(t) === typename) as
          | EchoSchema
          | undefined;
        if (!newSchema) {
          return;
        }

        const newView = ViewModel.make({
          query,
          jsonSchema: JsonSchema.toJsonSchema(newSchema),
        });
        Obj.update(view, (view) => {
          view.projection = Obj.getSnapshot(newView).projection as Mutable<typeof view.projection>;
        });
        setSchema(() => newSchema);
      } else {
        Obj.update(view, (view) => {
          view.query.ast = newQuery as Mutable<typeof newQuery>;
        });
        // NOTE: typename is no longer mutable on persisted Type.Type entities;
        // changing the query that targets a different typename now requires
        // re-creating the schema rather than renaming an existing one.
      }
    },
    [view, schema],
  );

  const handleDelete = useCallback(
    (property: string) => projectionRef.current?.deleteFieldProjection(property),
    [projectionRef],
  );

  // Expose objects on window for test access.
  useEffect(() => {
    if (typeof window !== 'undefined' && schema && view && projectionRef.current) {
      (window as any)[VIEW_EDITOR_DEBUG_SYMBOL] = {
        schema,
        view,
        projection: projectionRef.current,
      } satisfies ViewEditorDebugObjects;
    }
  }, [schema, view]);

  // NOTE(ZaymonFC): This looks awkward but it resolves an infinite parsing issue with sb.
  const json = useMemo(
    () => JSON.parse(JSON.stringify({ schema, view, projection: projectionRef.current })),
    [JSON.stringify(schema), JSON.stringify(view)],
  );

  if (!schema || !view) {
    return <div />;
  }

  return (
    <TestLayout json={json}>
      <ViewEditor
        ref={projectionRef}
        schema={schema}
        view={view}
        registry={undefined}
        mode={props.mode}
        readonly={props.readonly}
        types={types}
        tags={tags}
        onQueryChanged={updateViewQuery}
        onDelete={handleDelete}
      />
    </TestLayout>
  );
};

const meta = {
  title: 'ui/react-ui-form/ViewEditor',
  render: DefaultStory,
  decorators: [
    withClientProvider({
      createSpace: true,
      types: [Tag.Tag],
      onCreateSpace: ({ space }) => {
        space.db.add(Tag.make({ label: 'Important' }));
        space.db.add(Tag.make({ label: 'Investor' }));
        space.db.add(Tag.make({ label: 'New' }));
      },
    }),
    withTheme(),
    withLayout({ layout: 'fullscreen' }),
  ],
  parameters: {
    layout: 'fullscreen',
    translations,
  },
} satisfies Meta<typeof DefaultStory>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Readonly: Story = {
  args: {
    readonly: true,
  },
};

export const TagQueryMode: Story = {
  args: {
    mode: 'tag',
  },
};
