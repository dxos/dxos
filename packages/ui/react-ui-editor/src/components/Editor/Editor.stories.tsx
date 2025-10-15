//
// Copyright 2025 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React from 'react';
import { useMemo } from 'react';

import { createDocAccessor, createObject } from '@dxos/client/echo';
import { useThemeContext } from '@dxos/react-ui';
import { withTheme } from '@dxos/react-ui/testing';
import { DataType } from '@dxos/schema';

import { automerge, createBasicExtensions, createThemeExtensions } from '../../extensions';
import { Editor } from '../Editor';

const meta = {
  title: 'ui/react-ui-editor/Editor',
  component: Editor,
  decorators: [withTheme],
  parameters: {
    layout: 'column',
  },
} satisfies Meta<typeof Editor>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: (args) => {
    const { themeMode } = useThemeContext();
    const extensions = useMemo(
      () => [
        // Basic extensions.
        createBasicExtensions(),
        createThemeExtensions({ themeMode }),
      ],
      [],
    );

    return <Editor classNames='p-2' {...args} extensions={extensions} />;
  },
  args: {
    moveToEnd: true,
    value: 'Hello world!',
    onChange: (value) => console.log(value),
  },
};

export const Automerge: Story = {
  render: ({ value, ...props }) => {
    const { themeMode } = useThemeContext();
    const extensions = useMemo(
      () => [
        // Basic extensions.
        createBasicExtensions(),
        createThemeExtensions({ themeMode }),
        automerge(createDocAccessor(createObject(DataType.makeText(value)), ['content'])),
      ],
      [],
    );

    return <Editor classNames='p-2' {...props} extensions={extensions} />;
  },
  args: {
    moveToEnd: true,
    value: 'Hello world!',
    onChange: (value) => console.log(value),
  },
};
