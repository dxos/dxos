//
// Copyright 2024 DXOS.org
//

import '@dxos-theme';

import { type Meta, type StoryObj } from '@storybook/react-vite';
import { Schema } from 'effect';
import React, { useCallback, useMemo, useState, useEffect } from 'react';

import { Format, type EchoSchema, toJsonSchema, TypedObject } from '@dxos/echo-schema';
import { Filter, useQuery, useSpace } from '@dxos/react-client/echo';
import { withClientProvider } from '@dxos/react-client/testing';
import { useAsyncEffect } from '@dxos/react-ui';
import { DataType, ProjectionManager, createProjection } from '@dxos/schema';
import { withTheme, withLayout } from '@dxos/storybook-utils';

import { ViewEditor, type ViewEditorProps } from './ViewEditor';
import translations from '../../translations';
import { TestLayout, TestPanel, VIEW_EDITOR_DEBUG_SYMBOL } from '../testing';

// Type definition for debug objects exposed to tests.
export type ViewEditorDebugObjects = {
  schema: EchoSchema;
  projection: DataType.Projection;
  manager: ProjectionManager;
};

type StoryProps = Pick<ViewEditorProps, 'readonly'>;

const DefaultStory = (props: StoryProps) => {
  const space = useSpace();
  const [schema, setSchema] = useState<EchoSchema>();
  const [projection, setProjection] = useState<DataType.Projection>();
  const [manager, setManager] = useState<ProjectionManager>();
  useAsyncEffect(async () => {
    if (space) {
      class TestSchema extends TypedObject({ typename: 'example.com/type/Test', version: '0.1.0' })({
        name: Schema.String,
        email: Format.Email,
        salary: Format.Currency(),
      }) {}

      const [schema] = await space.db.schemaRegistry.register([TestSchema]);
      const projection = createProjection({
        typename: schema.typename,
        jsonSchema: toJsonSchema(TestSchema),
      });
      const manager = new ProjectionManager(schema.jsonSchema, projection);

      setSchema(schema);
      setProjection(projection);
      setManager(manager);
    }
  }, [space]);

  const projections = useQuery(space, Filter.type(DataType.Projection));
  const currentTypename = useMemo(() => projection?.query?.typename, [projection]);
  const updateViewTypename = useCallback(
    (newTypename: string) => {
      if (!schema) {
        return;
      }
      const matchingProjections = projections.filter((projection) => projection.query.typename === currentTypename);
      for (const projection of matchingProjections) {
        projection.query.typename = newTypename;
      }
      schema.updateTypename(newTypename);
    },
    [projections, schema],
  );

  const handleDelete = useCallback((property: string) => manager?.deleteFieldProjection(property), [manager]);

  // Expose objects on window for test access.
  useEffect(() => {
    if (typeof window !== 'undefined' && schema && manager && projection) {
      (window as any)[VIEW_EDITOR_DEBUG_SYMBOL] = { schema, manager, projection } satisfies ViewEditorDebugObjects;
    }
  }, [schema, manager, projection]);

  // NOTE(ZaymonFC): This looks awkward but it resolves an infinite parsing issue with sb.
  const json = useMemo(
    () => JSON.parse(JSON.stringify({ schema, manager, projection })),
    [JSON.stringify(schema), JSON.stringify(manager), JSON.stringify(projection)],
  );

  if (!schema || !manager || !projection) {
    return <div />;
  }

  return (
    <TestLayout json={json}>
      <TestPanel>
        <ViewEditor
          schema={schema}
          projection={projection}
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
