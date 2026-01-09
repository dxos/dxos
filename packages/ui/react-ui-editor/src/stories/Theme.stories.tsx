//
// Copyright 2025 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useMemo } from 'react';

import { useThemeContext } from '@dxos/react-ui';
import { withLayout, withTheme } from '@dxos/react-ui/testing';
import { createBasicExtensions, createThemeExtensions } from '@dxos/ui-editor';

import { Editor } from '../components';

const createText = (monospace?: boolean) =>
  [`${monospace ? 'monospace' : 'body'}`, 'Hello world', '0123456789'].join('\n');

const DefaultStory = () => {
  const { themeMode } = useThemeContext();
  const [ext1, ext2] = useMemo(
    () => [
      //
      [
        createBasicExtensions({ placeholder: 'Enter text', search: true }),
        createThemeExtensions({ themeMode, monospace: false }),
      ],
      [
        createBasicExtensions({ placeholder: 'Enter text', search: true }),
        createThemeExtensions({ themeMode, monospace: true }),
      ],
    ],
    [],
  );

  return (
    <div className='is-full grid grid-cols-2 gap-2'>
      <Editor.Root>
        <Editor.Content classNames='p-2' extensions={ext1} initialValue={createText(false)} />
      </Editor.Root>
      <Editor.Root>
        <Editor.Content classNames='p-2' extensions={ext2} initialValue={createText(true)} />
      </Editor.Root>
    </div>
  );
};

const meta: Meta<typeof DefaultStory> = {
  title: 'ui/react-ui-editor/Theme',
  component: DefaultStory,
  decorators: [withTheme, withLayout()],
  parameters: {
    layout: 'fullscreen',
  },
};

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {},
};
