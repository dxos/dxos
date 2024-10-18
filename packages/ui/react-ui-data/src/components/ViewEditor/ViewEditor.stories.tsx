//
// Copyright 2024 DXOS.org
//

import '@dxos-theme';

import { type StoryObj } from '@storybook/react';
import React from 'react';

import { create } from '@dxos/echo-schema';
import { type ViewType } from '@dxos/schema';
import { withTheme, withLayout, withSignals } from '@dxos/storybook-utils';

import { ViewEditor, type ViewEditorProps } from './ViewEditor';
import { useSchemaResolver } from '../../hooks';
import { testView } from '../../testing';
import translations from '../../translations';
import { TestPopup } from '../testing';

type StoryProps = Omit<ViewEditorProps, 'schemaResolver'>;

const Story = (props: StoryProps) => {
  const resolver = useSchemaResolver();
  if (!resolver) {
    return null;
  }

  return (
    <TestPopup>
      <ViewEditor schemaResolver={resolver} {...props} />
    </TestPopup>
  );
};

export default {
  title: 'react-ui-data/ViewEditor',
  decorators: [withTheme, withSignals, withLayout({ fullscreen: true, classNames: 'flex p-4 justify-center' })],
  render: Story,
  parameters: {
    translations,
  },
};

export const Default: StoryObj<StoryProps> = {
  args: {
    view: create(testView),
  },
};

export const Empty: StoryObj<StoryProps> = {
  args: {
    view: create<ViewType>({
      query: {
        schema: 'example.com/schema/TestSchema',
      },
      fields: [],
    }),
  },
};
