//
// Copyright 2024 DXOS.org
//

import '@dxos-theme';

import { type Meta, type StoryObj } from '@storybook/react';
import React, { useCallback, useEffect, useState } from 'react';

import { Format, type MutableSchema, S, toJsonSchema, TypedObject } from '@dxos/echo-schema';
import { useSpace } from '@dxos/react-client/echo';
import { withClientProvider } from '@dxos/react-client/testing';
import { SyntaxHighlighter } from '@dxos/react-ui-syntax-highlighter';
import { ViewProjection, createView } from '@dxos/schema';
import { type ViewType } from '@dxos/schema';
import { withTheme, withLayout } from '@dxos/storybook-utils';

import { ViewEditor } from './ViewEditor';
import translations from '../../translations';
import { TestPopup } from '../testing';

const DefaultStory = () => {
  const space = useSpace();
  const [schema, setSchema] = useState<MutableSchema>();
  const [view, setView] = useState<ViewType>();
  const [projection, setProjection] = useState<ViewProjection>();
  useEffect(() => {
    if (space) {
      class TestSchema extends TypedObject({ typename: 'example.com/type/Test', version: '0.1.0' })({
        name: S.String,
        email: Format.Email,
        salary: Format.Currency(),
      }) {}

      const schema = space.db.schemaRegistry.addSchema(TestSchema);
      const view = createView({ name: 'Test', typename: schema.typename, jsonSchema: toJsonSchema(TestSchema) });
      const projection = new ViewProjection(schema, view);

      setSchema(schema);
      setView(view);
      setProjection(projection);
    }
  }, [space]);

  const handleDelete = useCallback((property: string) => projection?.deleteFieldProjection(property), [projection]);

  if (!schema || !view || !projection) {
    return <div />;
  }

  return (
    <div className='w-full grid grid-cols-3'>
      <div className='flex col-span-2 w-full justify-center p-4'>
        <TestPopup>
          <ViewEditor schema={schema} view={view} registry={space?.db.schemaRegistry} onDelete={handleDelete} />
        </TestPopup>
      </div>
      <SyntaxHighlighter language='json' className='w-full text-xs font-thin'>
        {JSON.stringify({ schema, view, projection }, null, 2)}
      </SyntaxHighlighter>
    </div>
  );
};

const meta: Meta<typeof ViewEditor> = {
  title: 'ui/react-ui-data/ViewEditor',
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
