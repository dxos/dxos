//
// Copyright 2024 DXOS.org
//

import '@dxos-theme';

import React from 'react';

import { create } from '@dxos/echo-schema';
import { withTheme, withLayout } from '@dxos/storybook-utils';

import { ViewEditor, type ViewEditorProps } from './ViewEditor';
import { view, TestPopup } from '../../testing';
import translations from '../../translations';
import { ViewSchema, type ViewType } from '../../types';

const Story = (props: ViewEditorProps) => (
  <TestPopup>
    <ViewEditor {...props} />
  </TestPopup>
);

export default {
  title: 'react-ui-data/ViewEditor',
  decorators: [withTheme, withLayout({ fullscreen: true, classNames: 'flex p-4 justify-center' })],
  parameters: {
    translations,
  },
  render: Story,
};

export const Default = {
  args: {
    view: create(view),
  } satisfies ViewEditorProps,
};

export const Empty = {
  args: {
    view: create<ViewType>({ schema: ViewSchema, fields: [] }),
  } satisfies ViewEditorProps,
};
