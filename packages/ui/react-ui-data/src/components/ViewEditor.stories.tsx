//
// Copyright 2024 DXOS.org
//

import '@dxos-theme';

import React from 'react';

// import { createEchoObject } from '@dxos/echo-db';
import { create } from '@dxos/echo-schema';
import { withTheme, withLayout } from '@dxos/storybook-utils';

import { ViewEditor, type ViewEditorProps } from './ViewEditor';
import { view, TestPopup } from '../testing';
import translations from '../translations';
import { type ViewType } from '../types';

const Story = (props: ViewEditorProps) => (
  <TestPopup>
    <ViewEditor {...props} />
  </TestPopup>
);

export default {
  title: 'react-ui-data/ViewEditor',
  decorators: [withTheme, withLayout()],
  parameters: {
    layout: 'centered',
    translations,
  },
  render: Story,
};

export const Default = {
  args: {
    // TODO(burdon): Unsupported type function for path /data/schema
    view: create(view),
  } satisfies ViewEditorProps,
};

export const Empty = {
  args: {
    // schema: TestSchema,
    view: create<ViewType>({ /* schema: TestSchema, */ fields: [] }),
  } satisfies ViewEditorProps,
};
