//
// Copyright 2024 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import * as Schema from 'effect/Schema';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { type QueryAST, type View, DXN, EID, Filter, JsonSchema, Obj, Query, Scope, Tag, Type } from '@dxos/echo';
import { Format } from '@dxos/echo/Format';
import { type Mutable } from '@dxos/echo/Obj';
import { useQuery } from '@dxos/react-client/echo';
import { useClientStory, withClientProvider } from '@dxos/react-client/testing';
import { useAsyncEffect } from '@dxos/react-ui';
import { Loading, withLayout, withTheme } from '@dxos/react-ui/testing';
import { type ProjectionModel, ViewModel, getTypeURIFromQuery } from '@dxos/schema';
import { Employer, Organization, Person, Pipeline } from '@dxos/types';

import { translations } from '#translations';

import { VIEW_EDITOR_DEBUG_SYMBOL, TestLayout } from '../../testing';
import { type ViewEditorProps, ViewEditor } from './ViewEditor';

const types = [
  { value: Type.getURI(Organization.Organization), label: 'Organization' },
  { value: Type.getURI(Person.Person), label: 'Person' },
  { value: Type.getURI(Pipeline.Pipeline), label: 'Project' },
  { value: Type.getURI(Employer.Employer), label: 'Employer' },
];

// Type definition for debug objects exposed to tests.
export type ViewEditorDebugObjects = {
  type: Type.AnyEntity;
  view: View.View;
  projection: ProjectionModel;
};

type StoryArgs = Pick<ViewEditorProps, 'readonly' | 'mode'>;

const DefaultStory = (props: StoryArgs) => {
  const { space } = useClientStory();
  const [type, setType] = useState<Type.AnyEntity>();
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

      const testType = await space.db.addType(TestSchema);
      await space.db.addType(AlternateSchema);
      const view = ViewModel.make({
        name: 'Test',
        query: Query.select(Filter.type(TestSchema)),
        jsonSchema: JsonSchema.toJsonSchema(TestSchema),
      });

      setType(testType);
      setView(view);
    }
  }, [space]);

  const updateViewQuery = useCallback(
    async (newQuery: QueryAST.Query, target?: EID.EID) => {
      if (!type || !view || !space) {
        return;
      }

      if (props.mode === 'tag') {
        const queue = target;
        const query = queue ? Query.fromAst(newQuery).from([Scope.feed(queue)]) : Query.fromAst(newQuery);
        Obj.update(view, (view) => {
          view.query.ast = query.ast as Mutable<typeof query.ast>;
        });

        const typeUri = getTypeURIFromQuery(query.ast);
        const allTypes = space.db.graph.registry.list().filter(Type.isType);
        const newSchema = allTypes.find((t) => Type.getURI(t) === typeUri);
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
        setType(() => newSchema);
      } else {
        Obj.update(view, (view) => {
          view.query.ast = newQuery as Mutable<typeof newQuery>;
        });
      }
    },
    [view, type],
  );

  const handleDelete = useCallback(
    (property: string) => projectionRef.current?.deleteFieldProjection(property),
    [projectionRef],
  );

  // Expose objects on window for test access.
  useEffect(() => {
    if (typeof window !== 'undefined' && type && view && projectionRef.current) {
      (window as any)[VIEW_EDITOR_DEBUG_SYMBOL] = {
        type,
        view,
        projection: projectionRef.current,
      } satisfies ViewEditorDebugObjects;
    }
  }, [type, view]);

  // NOTE(ZaymonFC): Avoids infinite parsing issue with storybook args.
  const json = useMemo(
    () => JSON.parse(JSON.stringify({ schema: type, view, projection: projectionRef.current })),
    [JSON.stringify(type), JSON.stringify(view)],
  );

  if (!type || !view) {
    return <Loading />;
  }

  return (
    <TestLayout json={json}>
      <ViewEditor
        ref={projectionRef}
        type={type}
        view={view}
        registry={space?.db.graph.registry}
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
