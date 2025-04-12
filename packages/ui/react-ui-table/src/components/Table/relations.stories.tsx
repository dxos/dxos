//
// Copyright 2025 DXOS.org
//

import '@dxos-theme';

import { type StoryObj, type Meta } from '@storybook/react';
import React, { useMemo } from 'react';

import { AST, type S, ImmutableSchema, toJsonSchema, getSchemaTypename } from '@dxos/echo-schema';
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

const useTestModel = (schema: S.Schema.AnyNoContext) => {
  const table = useMemo(() => {
    const title = getAnnotation<string>(AST.TitleAnnotationId)(schema.ast);
    const view = createView({
      name: title ?? getSchemaTypename(schema) ?? '?', // TODO(burdon): Create function.
      typename: getSchemaTypename(schema),
      jsonSchema: toJsonSchema(schema),
    });

    return create(TableType, { view: makeRef(view) });
  }, []);

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
