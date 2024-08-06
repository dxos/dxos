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
  const handleMatch: CellEditorProps['onMatch'] = (text) => {
    console.log('?', text);
    return functions.filter((fn) => fn.startsWith(text.toUpperCase()));
  };

  if (!object) {
    return null;
  }

  const accessor = createDocAccessor(object, ['cells', cell, 'value']);
  return <CellEditor {...props} accessor={accessor} onMatch={handleMatch} />;
};

export const Default = {};

export const WithRange = {
  args: {
    value: '=SUM(A1:A5)',
  },
};
