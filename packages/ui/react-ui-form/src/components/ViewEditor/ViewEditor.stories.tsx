//
// Copyright 2024 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import { Schema } from 'effect';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { Filter, Obj, Query, Type } from '@dxos/echo';
import { QueryBuilder } from '@dxos/echo-query';
import { type EchoSchema, Format, toJsonSchema } from '@dxos/echo-schema';
import { useSpace } from '@dxos/react-client/echo';
import { withClientProvider } from '@dxos/react-client/testing';
import { useAsyncEffect } from '@dxos/react-ui';
import { withTheme } from '@dxos/react-ui/testing';
import { type DataType, type ProjectionModel, createView, typenameFromQuery } from '@dxos/schema';

import { translations } from '../../translations';
import { TestLayout, TestPanel, VIEW_EDITOR_DEBUG_SYMBOL } from '../testing';

import { ViewEditor, type ViewEditorProps } from './ViewEditor';

// Type definition for debug objects exposed to tests.
export type ViewEditorDebugObjects = {
  schema: EchoSchema;
  view: DataType.View;
  projection: ProjectionModel;
};

type StoryProps = Pick<ViewEditorProps, 'readonly' | 'mode'>;

const DefaultStory = (props: StoryProps) => {
  const space = useSpace();
  const [schema, setSchema] = useState<EchoSchema>();
  const [view, setView] = useState<DataType.View>();
  const projectionRef = useRef<ProjectionModel>(null);

  useAsyncEffect(async () => {
    if (space) {
      const TestSchema = Schema.Struct({
        name: Schema.String,
        email: Format.Email,
        salary: Format.Currency(),
      }).pipe(
        Type.Obj({
          typename: 'example.com/type/Test',
          version: '0.1.0',
        }),
      );

      const AlternateSchema = Schema.Struct({
        title: Schema.String,
        description: Schema.String,
        completed: Schema.Boolean,
      }).pipe(
        Type.Obj({
          typename: 'example.com/type/Alternate',
          version: '0.1.0',
        }),
      );

      const [testSchema] = await space.db.schemaRegistry.register([TestSchema, AlternateSchema]);
      const view = createView({
        name: 'Test',
        query: props.mode === 'query' ? 'Query.select(Filter.type(TestSchema))' : Query.select(Filter.type(TestSchema)),
        jsonSchema: toJsonSchema(TestSchema),
        presentation: Obj.make(Type.Expando, {}),
      });

      setSchema(testSchema);
      setView(view);
    }
  }, [space]);

  const updateViewQuery = useCallback(
    async (newQueryString: string) => {
      if (!schema || !view || !space) {
        return;
      }

      if (props.mode === 'query') {
        if (view.query.kind === 'ast') {
          return;
        }

        view.query.grammar = newQueryString;

        const builder = new QueryBuilder();
        const filter = builder.build(newQueryString) ?? Filter.nothing();
        const newQuery = Query.select(filter);
        const typename = typenameFromQuery({ kind: 'ast', ast: newQuery.ast });
        const [newSchema] = await space.db.schemaRegistry.query({ typename }).run();
        if (!newSchema) {
          return;
        }

        const newView = createView({
          query: newQuery,
          jsonSchema: newSchema.jsonSchema,
          presentation: Obj.make(Type.Expando, {}),
        });
        view.projection = Obj.getSnapshot(newView).projection;
        setSchema(() => newSchema);
      } else {
        const typename = newQueryString;
        const newQuery = Query.select(Filter.typename(typename));
        view.query = { kind: 'ast', ast: newQuery.ast };
        schema.updateTypename(typename);
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
      <TestPanel>
        <ViewEditor
          ref={projectionRef}
          schema={schema}
          view={view}
          registry={space?.db.schemaRegistry}
          mode={props.mode}
          readonly={props.readonly}
          onQueryChanged={updateViewQuery}
          onDelete={handleDelete}
        />
      </TestPanel>
    </TestLayout>
  );
};

const meta = {
  title: 'ui/react-ui-form/ViewEditor',
  render: DefaultStory,
  decorators: [withClientProvider({ createSpace: true }), withTheme],
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

export const QueryMode: Story = {
  args: {
    mode: 'query',
  },
};
