//
// Copyright 2024 DXOS.org
//

import '@dxos-theme';

import type { Meta } from '@storybook/react';

import { withLayout, withTheme } from '@dxos/storybook-utils';

import { Editor, type EditorProps } from './Editor';

const meta: Meta<EditorProps> = {
  title: 'plugins/plugin-grid/Editor',
  component: Editor,
  decorators: [withTheme, withLayout({ fullscreen: true })],
};

export default meta;

export const Default = {};
