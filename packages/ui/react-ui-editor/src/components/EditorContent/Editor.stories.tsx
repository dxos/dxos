//
// Copyright 2025 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React from 'react';
import { useMemo } from 'react';

import { createDocAccessor, createObject } from '@dxos/client/echo';
import { useThemeContext } from '@dxos/react-ui';
import { withLayout, withTheme } from '@dxos/react-ui/testing';
import { Text } from '@dxos/schema';

import { automerge, createBasicExtensions, createThemeExtensions } from '../../extensions';

import { Editor } from './Editor';

const meta = {
  title: 'ui/react-ui-editor/EditorComponent',
  component: Editor,
  decorators: [withTheme, withLayout({ container: 'column' })],
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
        automerge(createDocAccessor(createObject(Text.make(value)), ['content'])),
      ],
      [],
    );

    // TODO(burdon): Remove the need for initialValue.
    return <Editor classNames='p-2' {...props} initialValue={value} extensions={extensions} />;
  },
  args: {
    moveToEnd: true,
    value: 'Hello world!',
    onChange: (value) => console.log(value),
  },
};
