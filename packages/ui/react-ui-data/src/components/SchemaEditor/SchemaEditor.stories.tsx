//
// Copyright 2024 DXOS.org
//

import '@dxos-theme';

import React from 'react';

import { withTheme, withLayout } from '@dxos/storybook-utils';

import { SchemaEditor, type SchemaEditorProps } from './SchemaEditor';
import { TestSchema, TestPopup } from '../../testing';
import translations from '../../translations';

// TODO(burdon): Hierarchical schema editor.

const Story = (props: SchemaEditorProps) => (
  <TestPopup>
    <SchemaEditor {...props} />
  </TestPopup>
);

export default {
  title: 'react-ui-data/SchemaEditor',
  decorators: [withTheme, withLayout({ fullscreen: true, classNames: 'flex p-4 justify-center' })],
  parameters: {
    layout: 'centered',
    translations,
  },
  render: Story,
};

export const Default = {
  args: {
    schema: TestSchema,
  } satisfies SchemaEditorProps,
};
