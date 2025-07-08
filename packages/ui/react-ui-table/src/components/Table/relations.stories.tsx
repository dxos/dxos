//
// Copyright 2025 DXOS.org
//

import '@dxos-theme';

import { type StoryObj, type Meta } from '@storybook/react-vite';
import { SchemaAST } from 'effect';
import React, { useEffect, useMemo } from 'react';

import { Obj, Ref, type Type } from '@dxos/echo';
import { getSchemaTypename, toJsonSchema } from '@dxos/echo-schema';
import { getAnnotation } from '@dxos/effect';
import { invariant } from '@dxos/invariant';
import { faker } from '@dxos/random';
import { useClient } from '@dxos/react-client';
import { useClientProvider, withClientProvider } from '@dxos/react-client/testing';
import { DataType, createProjection, ProjectionManager } from '@dxos/schema';
import { createAsyncGenerator, type ValueGenerator } from '@dxos/schema/testing';
import { withLayout, withTheme } from '@dxos/storybook-utils';

import { Table } from './Table';
import { useTableModel } from '../../hooks';
import { type TableFeatures, TablePresentation, type TableRow } from '../../model';
import translations from '../../translations';
import { TableType } from '../../types';

faker.seed(1);
const generator: ValueGenerator = faker as any;

// TODO(burdon): Many-to-many relations.
// TODO(burdon): Mutable and immutable views.
// TODO(burdon): Reconcile schemas types and utils (see API PR).
// TODO(burdon): Base type for T (with id); see ECHO API PR?
const useTestModel = <S extends Type.Obj.Any>(schema: S, count: number) => {
  const { space } = useClientProvider();

  const jsonSchema = useMemo(() => toJsonSchema(schema), [schema]);
  const table = useMemo(() => {
    if (!space) {
      return undefined;
    }
    const typename = getSchemaTypename(schema);
    invariant(typename);
    const name = getAnnotation<string>(SchemaAST.TitleAnnotationId)(schema.ast) ?? typename;
    const projection = createProjection({ name, typename, jsonSchema });
    return space.db.add(Obj.make(TableType, { view: Ref.make(projection) }));
  }, [schema, space, jsonSchema]);

  const projection = useMemo(() => {
    if (!table?.view?.target) {
      return undefined;
    }

    // TODO(burdon): Just pass in view? Reuse same jsonSchema instance? View determines if mutable, etc.
    return new ProjectionManager(jsonSchema, table.view.target);
  }, [jsonSchema, table]);

  const features = useMemo<TableFeatures>(
    () => ({ schemaEditable: false, dataEditable: true, selection: { enabled: false } }),
    [],
  );

  const model = useTableModel<TableRow>({ table, projection, rows: [], features });
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
  title: 'ui/react-ui-table/relations',
  render: DefaultStory,
  parameters: { translations, controls: { disable: true } },
  decorators: [
    withClientProvider({
      types: [TableType, DataType.Projection, DataType.Organization, DataType.Person],
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
