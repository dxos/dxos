//
// Copyright 2024 DXOS.org
//

import '@dxosTheme';

import { HyperFormula } from 'hyperformula';
import React, { useEffect, useMemo, useState } from 'react';

import { Client } from '@dxos/client';
import { createDocAccessor, type EchoReactiveObject } from '@dxos/client/echo';
import { automerge } from '@dxos/react-ui-editor';
import { withTheme } from '@dxos/storybook-utils';

import { CellEditor, type CellEditorProps } from './CellEditor';
import { sheetExtension } from './extension';
import { createSheet, SheetType } from '../../types';

export default {
  title: 'plugin-sheet/CellEditor',
  component: CellEditor,
  render: (args: StoryProps) => <Story {...args} />,
  decorators: [withTheme],
};

type StoryProps = CellEditorProps;

const Story = ({ value, ...props }: StoryProps) => {
  const extension = useMemo(() => {
    const functions = HyperFormula.buildEmpty({ licenseKey: 'gpl-v3' }).getRegisteredFunctionNames();
    return [sheetExtension({ functions })];
  }, []);

  return <CellEditor {...props} value={value} extension={extension} />;
};

const AutomergeStory = ({ value, ...props }: StoryProps) => {
  const cell = 'A1';
  const [object, setObject] = useState<EchoReactiveObject<SheetType>>();
  useEffect(() => {
    setTimeout(async () => {
      const client = new Client();
      await client.initialize();
      await client.halo.createIdentity();
      const space = await client.spaces.create();
      client.addTypes([SheetType]);

      const sheet = createSheet();
      sheet.title = 'Test';
      sheet.cells[cell] = { value };
      space.db.add(sheet);
      setObject(sheet);
    });
  }, [value]);

  const extension = useMemo(() => {
    if (!object) {
      return [];
    }

    const functions = HyperFormula.buildEmpty({ licenseKey: 'gpl-v3' }).getRegisteredFunctionNames();
    const accessor = createDocAccessor(object, ['cells', cell, 'value']);
    return [automerge(accessor), sheetExtension({ functions })];
  }, [object]);

  return <CellEditor {...props} value={value} extension={extension} />;
};

export const Default = {};

export const AutoComplete = {
  args: {
    value: '=SUM',
  },
};

export const Formatting = {
  args: {
    value: '=SUM(A1:A2, 100, TRUE, "100", SUM(A1:A2, B1:B2))',
  },
};

export const Automerge = {
  render: (args: StoryProps) => <AutomergeStory {...args} />,
  args: {
    value: '=SUM(A1:A2, 100, TRUE, "100", SUM(A1:A2, B1:B2))',
  },
};
