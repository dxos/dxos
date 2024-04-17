//
// Copyright 2023 DXOS.org
//

import '@dxosTheme';

import React, { useEffect, useState } from 'react';

import { TableType } from '@braneframe/types';
import { createSpaceObjectGenerator, TestSchemaType } from '@dxos/echo-generator';
import { create } from '@dxos/echo-schema/schema';
import { faker } from '@dxos/random';
import { useClient } from '@dxos/react-client';
import { ClientRepeater, FullscreenDecorator } from '@dxos/react-client/testing';
import { withTheme } from '@dxos/storybook-utils';

import { ObjectTable } from './ObjectTable';

faker.seed(1);

const Story = () => {
  const client = useClient();
  const [table, setTable] = useState<TableType>();

  useEffect(() => {
    const space = client.spaces.default;
    const generator = createSpaceObjectGenerator(space);
    generator.addSchemas();
    generator.createObjects({ [TestSchemaType.project]: 6 });

    // TODO(zan): This can be moved to `onCreateSpace` on `clientRepeater` after client is made available
    // TODO(zan): Currently we need to cast as any since `_graph` is marked @internal.
    if (!(client as any)._graph.types.isEffectSchemaRegistered(TableType)) {
      (client as any)._graph.types.registerEffectSchema(TableType);
    }

    // We need a table to reference
    // TODO(zan): Workout how to get this to not double add in debug.
    space.db.add(create(TableType, { title: 'Other table', props: [], schema: generator.schemas[3] }));

    const table = space.db.add(create(TableType, { title: '', props: [] }));
    setTable(table);
  }, []);

  const containerRef = React.createRef<HTMLDivElement>();

  if (!table) {
    return null;
  }

  return (
    <div ref={containerRef} className='inset-0 overflow-auto'>
      <ObjectTable table={table} stickyHeader getScrollElement={() => containerRef.current} />
    </div>
  );
};

export default {
  title: 'plugin-table/ObjectTable',
  component: ObjectTable,
  render: () => <ClientRepeater component={Story} createIdentity createSpace />,
  decorators: [withTheme, FullscreenDecorator()],
  parameters: {
    layout: 'fullscreen',
  },
};

export const Default = {};
