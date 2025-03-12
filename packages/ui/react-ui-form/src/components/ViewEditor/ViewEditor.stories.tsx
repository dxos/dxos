//
// Copyright 2024 DXOS.org
//

import '@dxos-theme';

import { type Meta, type StoryObj } from '@storybook/react';
import React, { useCallback, useMemo, useState } from 'react';

import { Format, type EchoSchema, S, toJsonSchema, TypedObject } from '@dxos/echo-schema';
import { Filter, useQuery, useSpace } from '@dxos/react-client/echo';
import { withClientProvider } from '@dxos/react-client/testing';
import { useAsyncEffect } from '@dxos/react-ui';
import { ViewProjection, ViewType, createView } from '@dxos/schema';
import { withTheme, withLayout } from '@dxos/storybook-utils';

import { ViewEditor } from './ViewEditor';
import translations from '../../translations';
import { TestLayout, TestPanel } from '../testing';

const DefaultStory = () => {
  const space = useSpace();
  const [schema, setSchema] = useState<EchoSchema>();
  const [view, setView] = useState<ViewType>();
  const [projection, setProjection] = useState<ViewProjection>();
  useAsyncEffect(async () => {
    if (space) {
      class TestSchema extends TypedObject({ typename: 'example.com/type/Test', version: '0.1.0' })({
        name: S.String,
        email: Format.Email,
        salary: Format.Currency(),
      }) {}

      const [schema] = await space.db.schemaRegistry.register([TestSchema]);
      const view = createView({ name: 'Test', typename: schema.typename, jsonSchema: toJsonSchema(TestSchema) });
      const projection = new ViewProjection(schema, view);

      setSchema(schema);
      setView(view);
      setProjection(projection);
    }
  }, [space]);

  const views = useQuery(space, Filter.schema(ViewType));
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
  const handleDelete = useCallback((property: string) => projection?.deleteFieldProjection(property), [projection]);

  if (!schema || !view || !projection) {
    return <div />;
  }

  return (
    <TestLayout json={{ schema, view, projection }}>
      <TestPanel>
        <ViewEditor
          schema={schema}
          view={view}
          registry={space?.db.schemaRegistry}
          onTypenameChanged={updateViewTypename}
          onDelete={handleDelete}
        />
      </TestPanel>
    </TestLayout>
  );
};

const meta: Meta<typeof ViewEditor> = {
  title: 'ui/react-ui-form/ViewEditor',
  component: ViewEditor,
  render: DefaultStory,
  decorators: [withClientProvider({ createSpace: true }), withLayout({ fullscreen: true, tooltips: true }), withTheme],
  parameters: {
    translations,
  },
};

export default meta;

type Story = StoryObj;

export const Default: Story = {};
