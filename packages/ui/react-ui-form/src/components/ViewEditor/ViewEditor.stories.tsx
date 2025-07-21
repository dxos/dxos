//
// Copyright 2024 DXOS.org
//

import '@dxos-theme';

import { type Meta, type StoryObj } from '@storybook/react-vite';
import { Schema } from 'effect';
import React, { useCallback, useMemo, useState, useEffect } from 'react';

import { Obj, Type } from '@dxos/echo';
import { Format, type EchoSchema, toJsonSchema, TypedObject } from '@dxos/echo-schema';
import { Filter, useQuery, useSpace } from '@dxos/react-client/echo';
import { withClientProvider } from '@dxos/react-client/testing';
import { useAsyncEffect } from '@dxos/react-ui';
import { DataType, ProjectionModel, createView } from '@dxos/schema';
import { withTheme, withLayout } from '@dxos/storybook-utils';

import { ViewEditor, type ViewEditorProps } from './ViewEditor';
import { translations } from '../../translations';
import { TestLayout, TestPanel, VIEW_EDITOR_DEBUG_SYMBOL } from '../testing';

// Type definition for debug objects exposed to tests.
export type ViewEditorDebugObjects = {
  schema: EchoSchema;
  view: DataType.View;
  manager: ProjectionModel;
};

type StoryProps = Pick<ViewEditorProps, 'readonly'>;

const DefaultStory = (props: StoryProps) => {
  const space = useSpace();
  const [schema, setSchema] = useState<EchoSchema>();
  const [view, setView] = useState<DataType.View>();
  const [manager, setManager] = useState<ProjectionModel>();
  useAsyncEffect(async () => {
    if (space) {
      class TestSchema extends TypedObject({ typename: 'example.com/type/Test', version: '0.1.0' })({
        name: Schema.String,
        email: Format.Email,
        salary: Format.Currency(),
      }) {}

      const [schema] = await space.db.schemaRegistry.register([TestSchema]);
      const view = createView({
        typename: schema.typename,
        jsonSchema: toJsonSchema(TestSchema),
        presentation: Obj.make(Type.Expando, {}),
      });
      const manager = new ProjectionModel(schema.jsonSchema, view.projection);

      setSchema(schema);
      setView(view);
      setManager(manager);
    }
  }, [space]);

  const views = useQuery(space, Filter.type(DataType.View));
  const currentTypename = useMemo(() => view?.query?.typename, [view]);
  const updateViewTypename = useCallback(
    (newTypename: string) => {
      if (!schema) {
        return;
      }
      const matchingViews = views.filter((view) => view.query.typename === currentTypename);
      for (const view of matchingViews) {
        view.query.typename = newTypename;
      }
      schema.updateTypename(newTypename);
    },
    [views, schema],
  );

  const handleDelete = useCallback((property: string) => manager?.deleteFieldProjection(property), [manager]);

  // Expose objects on window for test access.
  useEffect(() => {
    if (typeof window !== 'undefined' && schema && manager && view) {
      (window as any)[VIEW_EDITOR_DEBUG_SYMBOL] = { schema, manager, view } satisfies ViewEditorDebugObjects;
    }
  }, [schema, manager, view]);

  // NOTE(ZaymonFC): This looks awkward but it resolves an infinite parsing issue with sb.
  const json = useMemo(
    () => JSON.parse(JSON.stringify({ schema, manager, view })),
    [JSON.stringify(schema), JSON.stringify(manager), JSON.stringify(view)],
  );

  if (!schema || !manager || !view) {
    return <div />;
  }

  return (
    <TestLayout json={json}>
      <TestPanel>
        <ViewEditor
          schema={schema}
          view={view}
          registry={space?.db.schemaRegistry}
          readonly={props.readonly}
          onTypenameChanged={updateViewTypename}
          onDelete={handleDelete}
        />
      </TestPanel>
    </TestLayout>
  );
};

const meta: Meta<StoryProps> = {
  title: 'ui/react-ui-form/ViewEditor',
  render: DefaultStory,
  decorators: [withClientProvider({ createSpace: true }), withLayout({ fullscreen: true }), withTheme],
  parameters: { translations },
};

export default meta;

type Story = StoryObj<StoryProps>;

export const Default: Story = {};

export const Readonly: Story = {
  args: { readonly: true },
};
