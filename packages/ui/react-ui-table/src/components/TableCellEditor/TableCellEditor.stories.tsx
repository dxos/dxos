//
// Copyright 2024 DXOS.org
//

import '@dxos-theme';

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useEffect, useMemo, useState } from 'react';

import { type EchoSchema, isMutable } from '@dxos/echo-schema';
import { invariant } from '@dxos/invariant';
import { faker } from '@dxos/random';
import { Filter, useQuery, live } from '@dxos/react-client/echo';
import { useClientProvider, withClientProvider } from '@dxos/react-client/testing';
import { defaultRowSize, Grid, type GridEditing } from '@dxos/react-ui-grid';
import { DataType, ProjectionManager } from '@dxos/schema';
import { withLayout, withTheme } from '@dxos/storybook-utils';

import { TableCellEditor, type TableCellEditorProps } from './TableCellEditor';
import { useTableModel } from '../../hooks';
import { type TableFeatures } from '../../model';
import translations from '../../translations';
import { initializeProjection } from '../../util';

type StoryProps = {
  editing: GridEditing;
};

const DefaultStory = ({ editing }: StoryProps) => {
  const { space } = useClientProvider();
  invariant(space);

  const projections = useQuery(space, Filter.type(DataType.Projection));
  const [projection, setProjection] = useState<DataType.Projection>();
  const [schema, setSchema] = useState<EchoSchema>();
  useEffect(() => {
    if (space && projections.length && !projection) {
      const projection = projections[0];
      setProjection(projection);
      setSchema(space.db.schemaRegistry.getSchema(projection.query.typename!));
    }
  }, [space, projections, projection]);

  const manager = useMemo(() => {
    if (schema && projection) {
      return new ProjectionManager(schema.jsonSchema, projection);
    }
  }, [schema, projection]);

  const features: Partial<TableFeatures> = useMemo(
    () => ({
      selection: { enabled: true, mode: 'multiple' },
      dataEditable: true,
      schemaEditable: schema && isMutable(schema),
    }),
    [schema],
  );

  const model = useTableModel({ projection: manager, features });

  const handleQuery: TableCellEditorProps['onQuery'] = async ({ field }) => {
    // TODO(dmaretskyi): If no schema query nothing
    const { objects } = await space.db.query(schema ? Filter.type(schema) : Filter.everything()).run();
    return objects.map((obj) => {
      const label = obj[field.referencePath ?? 'id'];
      return {
        label,
        data: obj,
      };
    });
  };

  if (!model || !schema || !projection) {
    return <div />;
  }

  return (
    <div className='flex w-[300px] border border-separator' style={{ height: defaultRowSize }}>
      <Grid.Root id='test' editing={editing}>
        <TableCellEditor model={model} onQuery={handleQuery} />
      </Grid.Root>
    </div>
  );
};

const meta: Meta<StoryProps> = {
  title: 'plugins/plugin-table/TableCellEditor',
  component: DefaultStory,
  render: DefaultStory,
  parameters: { translations, layout: 'centered' },
  decorators: [
    withClientProvider({
      types: [DataType.Projection],
      createIdentity: true,
      createSpace: true,
      onSpaceCreated: async ({ space }) => {
        const { schema, projection } = await initializeProjection({ space });
        space.db.add(projection);
        Array.from({ length: 10 }).forEach(() => {
          space.db.add(
            live(schema, {
              name: faker.person.fullName(),
            }),
          );
        });
      },
    }),
    withTheme,
    withLayout(),
  ],
};

export default meta;

type Story = StoryObj<StoryProps>;

export const Default: Story = {
  args: {
    editing: {
      index: 'grid,0,3',
      initialContent: 'Test',
      cellElement: null,
    },
  },
};
