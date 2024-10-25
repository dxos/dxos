//
// Copyright 2024 DXOS.org
//

import '@dxos-theme';

import { type Meta } from '@storybook/react';
import React, { useEffect, useMemo, useState } from 'react';

import { Client } from '@dxos/client';
import { createDocAccessor, type EchoReactiveObject } from '@dxos/client/echo';
import { automerge } from '@dxos/react-ui-editor';
import { CellEditor, type CellEditorProps } from '@dxos/react-ui-grid';
import { withTheme } from '@dxos/storybook-utils';

import { HyperFormula } from '#hyperformula';
import { createSheet } from '../../defs';
import { sheetExtension } from '../../extensions';
import { defaultFunctions } from '../../graph';
import { SheetType } from '../../types';

type StoryProps = CellEditorProps;

const Story = ({ value, ...props }: StoryProps) => {
  const extension = useMemo(() => {
    const functionNames = HyperFormula.buildEmpty({ licenseKey: 'gpl-v3' }).getRegisteredFunctionNames();
    const functions = defaultFunctions.filter(({ name }) => functionNames.includes(name));
    return [sheetExtension({ functions })];
  }, []);

  return <CellEditor {...props} value={value} extension={extension} />;
};

const AutomergeStory = ({ value, ...props }: StoryProps) => {
  const cell = 'A1';
  const [object, setObject] = useState<EchoReactiveObject<SheetType>>();
  useEffect(() => {
    setTimeout(async () => {
      const client = new Client({ types: [SheetType] });
      await client.initialize();
      await client.halo.createIdentity();
      const space = await client.spaces.create();

      const sheet = createSheet();
      sheet.name = 'Test';
      sheet.cells[cell] = { value };
      space.db.add(sheet);
      setObject(sheet);
    });
  }, [value]);

  const extension = useMemo(() => {
    if (!object) {
      return [];
    }

    const functionNames = HyperFormula.buildEmpty({ licenseKey: 'gpl-v3' }).getRegisteredFunctionNames();
    const functions = defaultFunctions.filter(({ name }) => functionNames.includes(name));
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

const meta: Meta = {
  title: 'plugins/plugin-sheet/CellEditor',
  component: CellEditor,
  render: (args: StoryProps) => <Story {...args} />,
  decorators: [withTheme],
};

export default meta;
