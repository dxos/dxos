//
// Copyright 2024 DXOS.org
//

import '@dxos-theme';

import { type Meta, type StoryObj } from '@storybook/react';
import React from 'react';

import { create } from '@dxos/echo-schema';
import { withClientProvider } from '@dxos/react-client/testing';
import { type ViewType } from '@dxos/schema';
import { testView } from '@dxos/schema/testing';
import { withTheme, withLayout } from '@dxos/storybook-utils';

import { ViewEditor, type ViewEditorProps } from './ViewEditor';
import { useSchemaResolver } from '../../hooks';
import translations from '../../translations';
import { TestPopup } from '../testing';

const DefaultStory = (props: ViewEditorProps) => {
  const resolver = useSchemaResolver(); // TODO(burdon): Mock.
  return (
    <TestPopup>
      <ViewEditor {...props} schemaResolver={resolver} />
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
      schema: 'example.com/schema/TestSchema',
      fields: [],
    }),
  },
};

const meta: Meta<typeof ViewEditor> = {
  title: 'ui/react-ui-data/ViewEditor',
  component: ViewEditor,
  render: DefaultStory,
  decorators: [
    withClientProvider(),
    withLayout({ fullscreen: true, classNames: 'flex p-4 justify-center' }),
    withTheme,
  ],
  parameters: {
    translations,
  },
};

export default meta;
