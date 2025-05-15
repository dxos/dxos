//
// Copyright 2025 DXOS.org
//

import '@dxos-theme';

import { type StoryObj, type Meta } from '@storybook/react';
import { type Schema } from 'effect';
import { SchemaAST } from 'effect';
import React, { useEffect, useMemo } from 'react';

import { type BaseObject, getTypename, type HasId, toJsonSchema } from '@dxos/echo-schema';
import { getAnnotation } from '@dxos/effect';
import { faker } from '@dxos/random';
import { live, makeRef } from '@dxos/react-client/echo';
import { useClientProvider, withClientProvider } from '@dxos/react-client/testing';
import { DataType, createView, ViewProjection, ViewType } from '@dxos/schema';
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
const useTestModel = <T extends BaseObject & HasId>(schema: Schema.Schema<T>, count: number) => {
  const { space } = useClientProvider();

  const table = useMemo(() => {
    // const { typename } = pipe(schema.ast, SchemaAST.getAnnotation<TypeAnnotation>(TypeAnnotationId), Option.getOrThrow);
    const typename = getTypename(schema)!;
    const name = getAnnotation<string>(SchemaAST.TitleAnnotationId)(schema.ast) ?? typename;
    const view = createView({ name, typename, jsonSchema: toJsonSchema(schema) });
    return live(TableType, { view: makeRef(view) });
  }, [schema]);

  const projection = useMemo(() => {
    if (!table.view?.target) {
      return undefined;
    }

    // TODO(burdon): Just pass in view? Reuse same jsonSchema instance? View determines if mutable, etc.
    return new ViewProjection(toJsonSchema(schema), table.view.target);
  }, [schema, table]);

  const features = useMemo<TableFeatures>(
    () => ({ schemaEditable: false, dataEditable: true, selection: { enabled: false } }),
    [],
  );

  const model = useTableModel<TableRow>({ table, projection, rows: [], features });
  useEffect(() => {
    if (!model || !space) {
      return;
    }

    const objectGenerator = createAsyncGenerator(generator, schema, { optional: true, db: space?.db });
    void objectGenerator.createObjects(count).then((objects) => {
      model.setRows(objects);
    });
  }, [model, space]);

  console.log(projection?.getFieldProjections());

  const presentation = useMemo(() => {
    if (!model) {
      return;
    }

    return new TablePresentation(model);
  }, [model]);

  return { model, presentation };
};

const DefaultStory = () => {
  const { model: orgModel, presentation: orgPresentation } = useTestModel<DataType.Organization>(
    DataType.Organization,
    50,
  );

  // TODO(burdon): Generate links with references.
  const { model: contactModel, presentation: contactPresentation } = useTestModel<DataType.Person>(DataType.Person, 50);

  return (
    <div className='is-full bs-full grid grid-cols-2 divide-x divide-separator'>
      <Table.Root>
        <Table.Main model={orgModel} presentation={orgPresentation} ignoreAttention />
      </Table.Root>
      <Table.Root>
        <Table.Main model={contactModel} presentation={contactPresentation} ignoreAttention />
      </Table.Root>
    </div>
  );
};

const meta: Meta<typeof DefaultStory> = {
  title: 'ui/react-ui-table/relations',
  render: DefaultStory,
  parameters: { translations },
  decorators: [
    withClientProvider({
      types: [TableType, ViewType, DataType.Organization, DataType.Person],
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
