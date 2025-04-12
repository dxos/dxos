//
// Copyright 2025 DXOS.org
//

import '@dxos-theme';

import { type StoryObj, type Meta } from '@storybook/react';
import { Option, pipe } from 'effect';
import React, { useMemo } from 'react';

import {
  AST,
  type S,
  toJsonSchema,
  ImmutableSchema,
  type ObjectAnnotation,
  ObjectAnnotationId,
} from '@dxos/echo-schema';
import { getAnnotation } from '@dxos/effect';
import { faker } from '@dxos/random';
import { create, makeRef } from '@dxos/react-client/echo';
import { withClientProvider } from '@dxos/react-client/testing';
import { createView, ViewProjection, ViewType } from '@dxos/schema';
import { Testing } from '@dxos/schema/testing';
import { withLayout, withTheme } from '@dxos/storybook-utils';

import { Table } from './Table';
import { useTableModel } from '../../hooks';
import translations from '../../translations';
import { TableType } from '../../types';
import { initializeTable } from '../../util';

// TODO(burdon): Document View vs. ViewProjection.
// TODO(burdon): Mutable and immutable views.
// TODO(burdon): Reconcile schemas types and utils (see API PR).

// TODO(burdon): This util hook shouldn't be needed (move into API).
// TODO(burdon): What type should we use for a schema that has the annotation?
const useTestModel = (schema: S.Schema.AnyNoContext) => {
  const table = useMemo(() => {
    const { typename } = pipe(schema.ast, AST.getAnnotation<ObjectAnnotation>(ObjectAnnotationId), Option.getOrThrow);
    const jsonSchema = toJsonSchema(schema);
    const name = getAnnotation<string>(AST.TitleAnnotationId)(schema.ast) ?? typename;
    const view = createView({ name, typename, jsonSchema });
    return create(TableType, { view: makeRef(view) });
  }, [schema]);

  const projection = useMemo(() => {
    if (!table.view?.target) {
      return undefined;
    }

    // TODO(burdon): Get schema from view?
    const base = new ImmutableSchema(schema);
    return new ViewProjection(base, table.view?.target);
  }, [table, schema]);

  // TODO(burdon): Convert to callback initializer.
  const model = useTableModel({ table, projection, objects: [] });
  return model;
};

const DefaultStory = () => {
  const org = useTestModel(Testing.OrgType);
  const contact = useTestModel(Testing.ContactType);
  return (
    <div className='flex grow grid grid-cols-2 gap-2'>
      <Table.Root>
        <Table.Main model={org} />
      </Table.Root>
      <Table.Root>
        <Table.Main model={contact} />
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
      types: [TableType, ViewType],
      createIdentity: true,
      createSpace: true,
      onSpaceCreated: async ({ client, space }) => {
        const table = space.db.add(create(TableType, {}));
        const schema = await initializeTable({ client, space, table, initialRow: false });
        Array.from({ length: 10 }).map(() => {
          return space.db.add(
            create(schema, {
              name: faker.person.fullName(),
            }),
          );
        });
      },
    }),
    withTheme,
    withLayout({ fullscreen: true, tooltips: true }),
  ],
};

export default meta;

type Story = StoryObj<typeof DefaultStory>;

export const Default: Story = {};
