//
// Copyright 2024 DXOS.org
//

import '@dxos-theme';

import { type Meta, type StoryObj } from '@storybook/react';
import React from 'react';

import { withTheme, withLayout } from '@dxos/storybook-utils';

import { SchemaEditor, type SchemaEditorProps } from './SchemaEditor';
import { TestSchema } from '../../testing';
import translations from '../../translations';
import { TestPopup } from '../testing';

// TODO(burdon): Hierarchical schema editor.

const Story = (props: SchemaEditorProps) => (
  <TestPopup>
    <SchemaEditor {...props} />
  </TestPopup>
);

export const Default: StoryObj<SchemaEditorProps> = {
  args: {
    schema: TestSchema,
  },
};

const meta: Meta<typeof SchemaEditor> = {
  title: 'ui/react-ui-data/SchemaEditor',
  decorators: [withTheme, withLayout({ fullscreen: true, classNames: 'flex p-4 justify-center' })],
  render: Story,
  parameters: {
    layout: 'centered',
    translations,
  },
};

export default meta;
