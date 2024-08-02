//
// Copyright 2024 DXOS.org
//

import '@dxosTheme';

import React, { useEffect, useState } from 'react';

import { Client } from '@dxos/client';
import { createDocAccessor, type EchoReactiveObject } from '@dxos/client/echo';
import { create, S, TypedObject } from '@dxos/echo-schema';
import { withTheme } from '@dxos/storybook-utils';

import { CellEditor, type CellEditorProps } from './CellEditor';

export default {
  title: 'plugin-grid/CellEditor',
  component: CellEditor,
  render: (args: CellEditorProps) => <Story {...args} />,
  decorators: [withTheme],
};

// TODO(burdon): Add styles.
const CellSchema = S.Struct({
  value: S.String,
});

class SheetType extends TypedObject({ typename: 'dxos.org/type/SheetType', version: '0.1.0' })({
  title: S.optional(S.String),
  // Cells indexed by A1 reference.
  // TODO(burdon): Not robust to adding rows/columns.
  cells: S.mutable(S.Record(S.String, CellSchema)).pipe(S.default({})),
}) {}

const Story = (props: CellEditorProps) => {
  const cell = 'A7';
  const [object, setObject] = useState<EchoReactiveObject<SheetType>>();
  useEffect(() => {
    setTimeout(async () => {
      // TODO(burdon): Make it easier to create tests.
      const client = new Client();
      await client.initialize();
      await client.halo.createIdentity();
      const space = await client.spaces.create();
      client.addTypes([SheetType]);

      // TODO(burdon): Throws missing "core" error if not added to db.
      const sheet = create(SheetType, { cells: {} });
      sheet.title = 'Test';
      sheet.cells[cell] = { value: '=SUM(A1:A5)' };
      space.db.add(sheet);
      setObject(sheet);
    });
  }, []);

  if (!object) {
    return null;
  }

  const accessor = createDocAccessor(object, ['cells', cell, 'value']);
  return <CellEditor {...props} accessor={accessor} />;
};

export const Default = {};
