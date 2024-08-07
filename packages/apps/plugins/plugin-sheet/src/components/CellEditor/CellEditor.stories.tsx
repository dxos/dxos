//
// Copyright 2024 DXOS.org
//

import '@dxosTheme';

import { HyperFormula } from 'hyperformula';
import React, { useEffect, useState } from 'react';

import { Client } from '@dxos/client';
import { createDocAccessor, type EchoReactiveObject } from '@dxos/client/echo';
import { create } from '@dxos/echo-schema';
import { withTheme } from '@dxos/storybook-utils';

import { CellEditor, type CellEditorProps } from './CellEditor';
import { SheetType } from '../../types';

export default {
  title: 'plugin-sheet/CellEditor',
  component: CellEditor,
  render: (args: StoryProps) => <Story {...args} />,
  decorators: [withTheme],
};

type StoryProps = CellEditorProps & { value2?: string };

const Story = ({ value, ...props }: StoryProps) => {
  const cell = 'A1';
  const [object, setObject] = useState<EchoReactiveObject<SheetType>>();
  useEffect(() => {
    setTimeout(async () => {
      // TODO(burdon): Make it easier to create tests.
      const client = new Client();
      await client.initialize();
      await client.halo.createIdentity();
      const space = await client.spaces.create();
      client.addTypes([SheetType]);

      const sheet = create(SheetType, { cells: {}, formatting: {} });
      sheet.title = 'Test';
      sheet.cells[cell] = { value };
      space.db.add(sheet);
      setObject(sheet);
    });
  }, []);

  const [functions] = useState(HyperFormula.buildEmpty({ licenseKey: 'gpl-v3' }).getRegisteredFunctionNames());

  if (!object) {
    return null;
  }

  const accessor = createDocAccessor(object, ['cells', cell, 'value']);
  return <CellEditor {...props} accessor={accessor} functions={functions} />;
};

export const Default = {};

export const AutoComplete = {
  args: {
    value: '=SUM',
  },
};

export const Formatting = {
  args: {
    value: '=SUM(A1:A2, TRUE, "100", SUM(A1:A2, B1:B2))',
  },
};
