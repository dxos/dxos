//
// Copyright 2025 DXOS.org
//

import '@dxos-theme';

import { type StoryObj, type Meta } from '@storybook/react';
import React, { useMemo } from 'react';

import { AST, ImmutableSchema, type BaseSchema } from '@dxos/echo-schema';
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
const useTestModel = (schema: BaseSchema) => {
  const table = useMemo(() => {
    // const { typename } = pipe(schema.ast, AST.getAnnotation<ObjectAnnotation>(ObjectAnnotationId), Option.getOrThrow);
    const jsonSchema = schema.jsonSchema;
    const typename = schema.typename;
    const name = getAnnotation<string>(AST.TitleAnnotationId)(schema.ast) ?? typename;
    const view = createView({ name, typename, jsonSchema });
    return create(TableType, { view: makeRef(view) });
  }, [schema]);

  const projection = useMemo(() => {
    if (!table.view?.target) {
      return undefined;
    }

    // TODO(burdon): Get schema from view inside of ViewProjection?
    return new ViewProjection(schema, table.view.target);
  }, [schema, table]);

  const model = useTableModel({ table, projection, objects: [] });
  return model;
};

const DefaultStory = () => {
  const orgSchema = useMemo(() => new ImmutableSchema(Testing.OrgType), []);
  const orgModel = useTestModel(orgSchema);

  const contactSchema = useMemo(() => new ImmutableSchema(Testing.ContactType), []);
  const contactModel = useTestModel(contactSchema);

  return (
    <div className='flex grow grid grid-cols-2 gap-2'>
      <Table.Root>
        <Table.Main model={orgModel} />
      </Table.Root>
      <Table.Root>
        <Table.Main model={contactModel} />
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
