//
// Copyright 2024 DXOS.org
//

import '@dxos-theme';

import { type Meta, type StoryObj } from '@storybook/react';
import React from 'react';

import { create } from '@dxos/echo-schema';
import { type ViewType } from '@dxos/schema';
import { withTheme, withLayout, withSignals } from '@dxos/storybook-utils';

import { ViewEditor, type ViewEditorProps } from './ViewEditor';
import { useSchemaResolver } from '../../hooks';
import { testView } from '../../testing';
import translations from '../../translations';
import { TestPopup } from '../testing';

const Story = (props: ViewEditorProps) => {
  const resolver = useSchemaResolver();
  return (
    <TestPopup>
      <ViewEditor schemaResolver={resolver} {...props} />
    </TestPopup>
  );
};

export const Default: StoryObj<typeof ViewEditor> = {
  args: {
    view: create(testView),
  },
};

export const Empty: StoryObj<typeof ViewEditor> = {
  args: {
    view: create<ViewType>({
      query: {
        schema: 'example.com/schema/TestSchema',
      },
      fields: [],
    }),
  },
};

const meta: Meta<typeof ViewEditor> = {
  title: 'ui/react-ui-data/ViewEditor',
  component: ViewEditor,
  render: Story,
  decorators: [withTheme, withSignals, withLayout({ fullscreen: true, classNames: 'flex p-4 justify-center' })],
  parameters: {
    translations,
  },
};

export default meta;
