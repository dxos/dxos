//
// Copyright 2024 DXOS.org
//

import '@dxos-theme';

import { type Meta, type StoryObj } from '@storybook/react';
import React from 'react';

import { createMutableSchema } from '@dxos/echo-schema/testing';
import { log } from '@dxos/log';
import { ViewProjection } from '@dxos/schema';
import { TestSchema, testView } from '@dxos/schema/testing';
import { withLayout, withTheme } from '@dxos/storybook-utils';

import { FieldEditor, type FieldEditorProps } from './FieldEditor';
import translations from '../../translations';
import { TestLayout, TestPanel } from '../testing';

type StoryProps = FieldEditorProps;

const DefaultStory = (props: FieldEditorProps) => {
  const handleComplete: FieldEditorProps['onSave'] = () => {
    log.info('onClose', { props });
  };

  return (
    <TestLayout json={{ props }}>
      <TestPanel>
        <FieldEditor {...props} onSave={handleComplete} />
      </TestPanel>
    </TestLayout>
  );
};

const meta: Meta<StoryProps> = {
  title: 'ui/react-ui-form/FieldEditor',
  component: FieldEditor,
  render: DefaultStory,
  decorators: [withLayout({ fullscreen: true }), withTheme],
  parameters: {
    translations,
  },
};

export default meta;

type Story = StoryObj<StoryProps>;

export const Default: Story = {
  args: {
    projection: new ViewProjection(createMutableSchema(TestSchema), testView),
    view: testView,
    field: testView.fields[0],
  },
};
