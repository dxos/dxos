//
// Copyright 2024 DXOS.org
//

import '@dxos-theme';

import React from 'react';

import { create } from '@dxos/echo-schema';
import { ViewSchema, type ViewType } from '@dxos/schema';
import { withTheme, withLayout, withSignals } from '@dxos/storybook-utils';

import { ViewEditor, type ViewEditorProps } from './ViewEditor';
import { testView } from '../../testing';
import translations from '../../translations';
import { TestPopup } from '../testing';

const Story = (props: ViewEditorProps) => (
  <TestPopup>
    <ViewEditor {...props} />
  </TestPopup>
);

export default {
  title: 'react-ui-data/ViewEditor',
  decorators: [withTheme, withSignals, withLayout({ fullscreen: true, classNames: 'flex p-4 justify-center' })],
  parameters: {
    translations,
  },
  render: Story,
};

export const Default = {
  args: {
    view: create(testView),
  } satisfies ViewEditorProps,
};

export const Empty = {
  args: {
    view: create<ViewType>({ query: { schema: ViewSchema }, fields: [] }),
  } satisfies ViewEditorProps,
};
