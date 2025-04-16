//
// Copyright 2025 DXOS.org
//

import '@dxos-theme';

import { type StoryObj, type Meta } from '@storybook/react';
import React, { useEffect, useMemo } from 'react';

import { AST, type BaseObject, ImmutableSchema, type BaseSchema, type HasId } from '@dxos/echo-schema';
import { getAnnotation } from '@dxos/effect';
import { faker } from '@dxos/random';
import { create, makeRef, type ReactiveObject } from '@dxos/react-client/echo';
import { withClientProvider } from '@dxos/react-client/testing';
import { createView, ViewProjection, ViewType } from '@dxos/schema';
import { createGenerator, Testing, type ValueGenerator } from '@dxos/schema/testing';
import { withLayout, withTheme } from '@dxos/storybook-utils';

import { Table } from './Table';
import { useTableModel } from '../../hooks';
import { TablePresentation } from '../../model';
import translations from '../../translations';
import { TableType } from '../../types';

faker.seed(1);
const generator: ValueGenerator = faker as any;

// TODO(burdon): Many-to-many relations.
// TODO(burdon): Mutable and immutable views.
// TODO(burdon): Reconcile schemas types and utils (see API PR).
// TODO(burdon): Base type for T (with id); see ECHO API PR?
const useTestModel = <T extends BaseObject & HasId>(schema: BaseSchema<T>, count: number) => {
  const table = useMemo(() => {
    // const { typename } = pipe(schema.ast, AST.getAnnotation<ObjectAnnotation>(ObjectAnnotationId), Option.getOrThrow);
    const typename = schema.typename;
    const name = getAnnotation<string>(AST.TitleAnnotationId)(schema.ast) ?? typename;
    const view = createView({ name, typename, jsonSchema: schema.jsonSchema });
    return create(TableType, { view: makeRef(view) });
  }, [schema]);

  const projection = useMemo(() => {
    if (!table.view?.target) {
      return undefined;
    }

    // TODO(burdon): Just pass in view? Reuse same jsonSchema instance? View determines if mutable, etc.
    return new ViewProjection(schema.jsonSchema, table.view.target);
  }, [schema, table]);

  const model = useTableModel({ table, projection, objects: [] });
  useEffect(() => {
    if (!model) {
      return;
    }

    const objectGenerator = createGenerator(generator, schema, { optional: true });
    const objects: ReactiveObject<T>[] = Array.from({ length: count }).map(() => objectGenerator.createObject());
    model.setRows(objects);
  }, [model]);

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
  const orgSchema = useMemo(() => new ImmutableSchema(Testing.OrgType), []);
  const { model: orgModel, presentation: orgPresentation } = useTestModel<Testing.OrgType>(orgSchema, 50);

  // TODO(burdon): Generate links with references.
  const contactSchema = useMemo(() => new ImmutableSchema(Testing.ContactType), []);
  const { model: contactModel, presentation: contactPresentation } = useTestModel<Testing.ContactType>(
    contactSchema,
    50,
  );

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
      types: [TableType, ViewType, Testing.OrgType, Testing.ContactType],
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
