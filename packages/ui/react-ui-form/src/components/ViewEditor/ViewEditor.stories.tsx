//
// Copyright 2024 DXOS.org
//

import '@dxos-theme';

import { type Meta, type StoryObj } from '@storybook/react-vite';
import { Schema } from 'effect';
import React, { useCallback, useEffect, useMemo, useState } from 'react';

import { Filter, Obj, Query, Type } from '@dxos/echo';
import { type EchoSchema, Format, toJsonSchema } from '@dxos/echo-schema';
import { useSpace } from '@dxos/react-client/echo';
import { withClientProvider } from '@dxos/react-client/testing';
import { useAsyncEffect } from '@dxos/react-ui';
import { QueryParser, createFilter } from '@dxos/react-ui-components';
import { type DataType, ProjectionModel, createView, typenameFromQuery } from '@dxos/schema';
import { withLayout, withTheme } from '@dxos/storybook-utils';

import { translations } from '../../translations';
import { TestLayout, TestPanel, VIEW_EDITOR_DEBUG_SYMBOL } from '../testing';

import { ViewEditor, type ViewEditorProps } from './ViewEditor';

// Type definition for debug objects exposed to tests.
export type ViewEditorDebugObjects = {
  schema: EchoSchema;
  view: DataType.View;
  projection: ProjectionModel;
};

type StoryProps = Pick<ViewEditorProps, 'readonly' | 'kind'>;

const DefaultStory = (props: StoryProps) => {
  const space = useSpace();
  const [schema, setSchema] = useState<EchoSchema>();
  const [view, setView] = useState<DataType.View>();
  const [projection, setProjection] = useState<ProjectionModel>();
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

      const [schema] = await space.db.schemaRegistry.register([TestSchema]);
      const view = createView({
        name: 'Test',
        query: Query.select(Filter.type(TestSchema)),
        jsonSchema: toJsonSchema(TestSchema),
        presentation: Obj.make(Type.Expando, {}),
      });
      const projection = new ProjectionModel(schema.jsonSchema, view.projection);

      setSchema(schema);
      setView(view);
      setProjection(projection);
    }
  }, [space]);

  const updateViewQuery = useCallback(
    (newQueryString: string) => {
      if (!schema || !view) {
        return;
      }

      if (props.kind === 'advanced') {
        try {
          // TODO(burdon): Use QueryBuilder from @dxos/echo-query.
          const parser = new QueryParser(newQueryString);
          // TODO(wittjosiah): When this fails it should show validation errors in the UI.
          const newQuery = Query.select(createFilter(parser.parse()));
          view.query = newQuery.ast;

          const typename = typenameFromQuery(newQuery.ast);
          if (typename) {
            schema.updateTypename(typename);
          }
        } catch {}
      } else {
        const typename = newQueryString;
        const newQuery = Query.select(Filter.typename(typename));
        view.query = newQuery.ast;
        schema.updateTypename(typename);
      }
    },
    [view, schema],
  );

  const handleDelete = useCallback((property: string) => projection?.deleteFieldProjection(property), [projection]);

  // Expose objects on window for test access.
  useEffect(() => {
    if (typeof window !== 'undefined' && schema && view && projection) {
      (window as any)[VIEW_EDITOR_DEBUG_SYMBOL] = { schema, view, projection } satisfies ViewEditorDebugObjects;
    }
  }, [schema, view, projection]);

  // NOTE(ZaymonFC): This looks awkward but it resolves an infinite parsing issue with sb.
  const json = useMemo(
    () => JSON.parse(JSON.stringify({ schema, view, projection })),
    [JSON.stringify(schema), JSON.stringify(view), JSON.stringify(projection)],
  );

  if (!schema || !view || !projection) {
    return <div />;
  }

  return (
    <TestLayout json={json}>
      <TestPanel>
        <ViewEditor
          schema={schema}
          view={view}
          registry={space?.db.schemaRegistry}
          kind={props.kind}
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
  decorators: [
    withClientProvider({
      createSpace: true,
    }),
    withLayout({
      fullscreen: true,
    }),
    withTheme,
  ],
  parameters: { translations },
} satisfies Meta<typeof DefaultStory>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Readonly: Story = {
  args: { readonly: true },
};

export const Advanced: Story = {
  args: { kind: 'advanced' },
};
