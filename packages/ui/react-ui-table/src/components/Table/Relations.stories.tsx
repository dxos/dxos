//
// Copyright 2025 DXOS.org
//

import '@dxos-theme';

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useEffect, useMemo, useState } from 'react';

import { Type } from '@dxos/echo';
import { type JsonSchemaType } from '@dxos/echo-schema';
import { faker } from '@dxos/random';
import { useClient } from '@dxos/react-client';
import { useClientProvider, withClientProvider } from '@dxos/react-client/testing';
import { DataType } from '@dxos/schema';
import { type ValueGenerator, createAsyncGenerator } from '@dxos/schema/testing';
import { withLayout, withTheme } from '@dxos/storybook-utils';

import { useTableModel } from '../../hooks';
import { type TableFeatures, TablePresentation, type TableRow } from '../../model';
import { translations } from '../../translations';
import { TableView } from '../../types';
import { createTable } from '../../util';

import { Table } from './Table';

faker.seed(1);
const generator: ValueGenerator = faker as any;

// TODO(burdon): Many-to-many relations.
// TODO(burdon): Mutable and immutable views.
// TODO(burdon): Reconcile schemas types and utils (see API PR).
// TODO(burdon): Base type for T (with id); see ECHO API PR?
const useTestModel = <S extends Type.Obj.Any>(schema: S, count: number) => {
  const client = useClient();
  const { space } = useClientProvider();
  const [view, setView] = useState<DataType.View>();
  const [jsonSchema, setJsonSchema] = useState<JsonSchemaType>();

  const features = useMemo<TableFeatures>(
    () => ({ schemaEditable: false, dataEditable: true, selection: { enabled: false } }),
    [],
  );

  useEffect(() => {
    if (!space) {
      return;
    }

    const timeout = setTimeout(async () => {
      const {
        jsonSchema,
        schema: effectSchema,
        view,
      } = await createTable({ client, space, typename: Type.getTypename(schema) });
      setJsonSchema(jsonSchema);
      setView(view);
      space.db.add(view);
      await space.db.schemaRegistry.register([effectSchema]);
    });
    return () => clearTimeout(timeout);
  }, [client, space, schema]);

  const model = useTableModel<TableRow>({ view, schema: jsonSchema, rows: [], features });

  useEffect(() => {
    if (!model || !space) {
      return;
    }

    const objectGenerator = createAsyncGenerator(generator, schema, { db: space?.db, force: true });
    void objectGenerator.createObjects(count).then((objects) => {
      model.setRows(objects);
    });
  }, [model, space]);

  const presentation = useMemo(() => {
    if (!model) {
      return;
    }

    return new TablePresentation(model);
  }, [model]);

  return { model, presentation };
};

const DefaultStory = () => {
  const client = useClient();
  const { model: orgModel, presentation: orgPresentation } = useTestModel(DataType.Organization, 50);
  const { model: contactModel, presentation: contactPresentation } = useTestModel(DataType.Person, 50);

  return (
    <div className='is-full bs-full grid grid-cols-2 divide-x divide-separator'>
      <Table.Root>
        <Table.Main model={orgModel} presentation={orgPresentation} client={client} ignoreAttention />
      </Table.Root>
      <Table.Root>
        <Table.Main model={contactModel} presentation={contactPresentation} client={client} ignoreAttention />
      </Table.Root>
    </div>
  );
};

const meta: Meta<typeof DefaultStory> = {
  title: 'ui/react-ui-table/Relations',
  render: DefaultStory,
  parameters: { translations, controls: { disable: true } },
  decorators: [
    withClientProvider({
      types: [DataType.View, DataType.Organization, DataType.Person, TableView],
      createIdentity: true,
      createSpace: true,
    }),
    withTheme,
    withLayout({ fullscreen: true }),
  ],
};

export default meta;

type Story = StoryObj<typeof DefaultStory>;

export const Default: Story = {};
