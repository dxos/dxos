//
// Copyright 2024 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useMemo, useState } from 'react';

import { Client } from '@dxos/client';
import { createDocAccessor } from '@dxos/client/echo';
import { defaultFunctions } from '@dxos/compute';
import { getRegisteredFunctionNames } from '@dxos/compute/testing';
import { useAsyncEffect } from '@dxos/react-hooks';
import { automerge } from '@dxos/react-ui-editor';
import { CellEditor, type CellEditorProps } from '@dxos/react-ui-grid';
import { withTheme } from '@dxos/react-ui/testing';

import { sheetExtension } from '../../extensions';
import { SheetType, createSheet } from '../../types';

const DefaultStory = ({ value, ...props }: CellEditorProps) => {
  const extensions = useMemo(() => {
    const functionNames = getRegisteredFunctionNames();
    const functions = defaultFunctions.filter(({ name }) => functionNames.includes(name));
    return [sheetExtension({ functions })];
  }, []);

  return <CellEditor {...props} value={value} extensions={extensions} />;
};

const AutomergeStory = ({ value, ...props }: CellEditorProps) => {
  const cell = 'A1';
  const [object, setObject] = useState<SheetType>();
  useAsyncEffect(async () => {
    const client = new Client({ types: [SheetType] });
    await client.initialize();
    await client.halo.createIdentity();
    const space = await client.spaces.create();

    const sheet = createSheet();
    sheet.name = 'Test';
    sheet.cells[cell] = { value };
    space.db.add(sheet);
    setObject(sheet);
  }, [value]);

  const extensions = useMemo(() => {
    if (!object) {
      return [];
    }

    const functionNames = getRegisteredFunctionNames();
    const functions = defaultFunctions.filter(({ name }) => functionNames.includes(name));
    const accessor = createDocAccessor(object, ['cells', cell, 'value']);
    return [automerge(accessor), sheetExtension({ functions })];
  }, [object]);

  return <CellEditor {...props} value={value} extensions={extensions} />;
};

const meta = {
  title: 'plugins/plugin-sheet/CellEditor',

  decorators: [withTheme],
  component: CellEditor,
  render: DefaultStory,
} satisfies Meta<typeof DefaultStory>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const AutoComplete: Story = {
  args: {
    value: '=SUM',
  },
};

export const Formatting: Story = {
  args: {
    value: '=SUM(A1:A2, 100, TRUE, "100", SUM(A1:A2, B1:B2))',
  },
};

export const Automerge: Story = {
  render: AutomergeStory,
  args: {
    value: '=SUM(A1:A2, 100, TRUE, "100", SUM(A1:A2, B1:B2))',
  },
};
