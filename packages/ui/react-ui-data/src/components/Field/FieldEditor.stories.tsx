//
// Copyright 2024 DXOS.org
//

import '@dxos-theme';

import { type Meta, type StoryObj } from '@storybook/react';
import React from 'react';

import { createMutableSchema } from '@dxos/echo-schema/testing';
import { type JsonProp } from '@dxos/effect';
import { SyntaxHighlighter } from '@dxos/react-ui-syntax-highlighter';
import { ViewProjection } from '@dxos/schema';
import { TestSchema, testView } from '@dxos/schema/testing';
import { withLayout, withTheme } from '@dxos/storybook-utils';

import { FieldEditor, type FieldEditorProps } from './FieldEditor';
import translations from '../../translations';
import { TestPopup } from '../testing';

type StoryProps = FieldEditorProps;

const DefaultStory = (props: FieldEditorProps) => {
  const handleComplete: FieldEditorProps['onClose'] = () => {
    console.log('complete');
  };

  return (
    <div className='w-full grid grid-cols-3'>
      <div className='flex col-span-2 w-full justify-center p-4'>
        <TestPopup>
          <FieldEditor {...props} onClose={handleComplete} />
        </TestPopup>
      </div>
      <SyntaxHighlighter language='json' className='w-full text-xs font-thin'>
        {JSON.stringify(props, null, 2)}
      </SyntaxHighlighter>
    </div>
  );
};

const meta: Meta<StoryProps> = {
  title: 'ui/react-ui-data/FieldEditor',
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
    field: {
      property: 'name' as JsonProp,
    },
    projection: new ViewProjection(createMutableSchema(TestSchema), testView),
    view: testView,
  },
};
