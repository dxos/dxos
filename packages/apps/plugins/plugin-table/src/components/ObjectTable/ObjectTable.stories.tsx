//
// Copyright 2023 DXOS.org
//

import '@dxosTheme';

import React, { useEffect, useState } from 'react';

import { Table as TableType } from '@braneframe/types/proto';
import { createSpaceObjectGenerator, TestSchemaType } from '@dxos/echo-generator';
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

    const schema = generator.getSchema(TestSchemaType.project);
    const table = space.db.add(new TableType({ schema }));
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
