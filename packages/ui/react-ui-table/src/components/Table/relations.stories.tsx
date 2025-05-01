//
// Copyright 2025 DXOS.org
//

import '@dxos-theme';

import { type StoryObj, type Meta } from '@storybook/react';
import React, { useEffect, useMemo } from 'react';

import { AST, type BaseObject, ImmutableSchema, type BaseSchema, type HasId } from '@dxos/echo-schema';
import { getAnnotation } from '@dxos/effect';
import { faker } from '@dxos/random';
import { live, makeRef, type Live } from '@dxos/react-client/echo';
import { useClientProvider, withClientProvider } from '@dxos/react-client/testing';
import { createView, ViewProjection, ViewType } from '@dxos/schema';
import { createAsyncGenerator, createGenerator, Testing, type ValueGenerator } from '@dxos/schema/testing';
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
const useTestModel = <T extends BaseObject & HasId>(schema: BaseSchema<T>, count: number) => {
  const { space } = useClientProvider();

  const table = useMemo(() => {
    // const { typename } = pipe(schema.ast, AST.getAnnotation<TypeAnnotation>(TypeAnnotationId), Option.getOrThrow);
    const typename = schema.typename;
    const name = getAnnotation<string>(AST.TitleAnnotationId)(schema.ast) ?? typename;
    const view = createView({ name, typename, jsonSchema: schema.jsonSchema });
    return live(TableType, { view: makeRef(view) });
  }, [schema]);

  const projection = useMemo(() => {
    if (!table.view?.target) {
      return undefined;
    }

    // TODO(burdon): Just pass in view? Reuse same jsonSchema instance? View determines if mutable, etc.
    return new ViewProjection(schema.jsonSchema, table.view.target);
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

  const presentation = useMemo(() => {
    if (!model) {
      return;
    }

    return new TablePresentation(model);
  }, [model]);

  return { model, presentation };
};

const DefaultStory = () => {
  // TODO(burdon): Remove need for ImmutableSchema wrapper at API-level.
  const orgSchema = useMemo(() => new ImmutableSchema(Testing.Org), []);
  const { model: orgModel, presentation: orgPresentation } = useTestModel<Testing.Org>(orgSchema, 50);

  // TODO(burdon): Generate links with references.
  const contactSchema = useMemo(() => new ImmutableSchema(Testing.Contact), []);
  const { model: contactModel, presentation: contactPresentation } = useTestModel<Testing.Contact>(contactSchema, 50);

  // TODO(burdon): Scrolling isn't working.
  return (
    <div className='grow grid grid-cols-2 divide-x divide-separator'>
      <Table.Root>
        <Table.Main model={orgModel} presentation={orgPresentation} />
      </Table.Root>
      <Table.Root>
        <Table.Main model={contactModel} presentation={contactPresentation} />
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
      types: [TableType, ViewType, Testing.Org, Testing.Contact],
      createIdentity: true,
      createSpace: true,
    }),
    withTheme,
    withLayout({ fullscreen: true, tooltips: true }),
  ],
};

export default meta;

type Story = StoryObj<typeof DefaultStory>;

export const Default: Story = {};
