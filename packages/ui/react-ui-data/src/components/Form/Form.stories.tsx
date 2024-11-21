//
// Copyright 2024 DXOS.org
//

import '@dxos-theme';

import { type Meta, type StoryObj } from '@storybook/react';
import React, { useCallback, useState } from 'react';

import { FormatEnum, type JsonProp, TypeEnum } from '@dxos/echo-schema';
import { SyntaxHighlighter } from '@dxos/react-ui-syntax-highlighter';
import { getPropertySchemaForFormat, type PropertyType } from '@dxos/schema';
import { withLayout, withTheme } from '@dxos/storybook-utils';

import { Form, type FormProps } from './Form';
import translations from '../../translations';
import { TestPopup } from '../testing';

type StoryProps = FormProps<PropertyType>;

const DefaultStory = (props: StoryProps) => {
  const [field, setField] = useState(props.values);
  // TODO(ZaymonFC): Workout why this throws if you unwrap the object.
  const [{ schema }, setSchema] = useState({ schema: getPropertySchemaForFormat(field.format) });

  const handleValueChange = useCallback((values: FormProps<PropertyType>['values']) => {
    setSchema({ schema: getPropertySchemaForFormat(values.format) });
  }, []);

  const handleSave = useCallback((field: any) => {
    console.log('handleSave', field);
    setField(field);
  }, []);

  if (!schema) {
    return <div>No schema found for format: {field.format}</div>;
  }

  return (
    <div className='w-full grid grid-cols-3'>
      <div className='flex col-span-2 w-full justify-center p-4'>
        <TestPopup>
          <Form values={field} schema={schema} onValuesChanged={handleValueChange} onSave={handleSave} />
        </TestPopup>
      </div>
      <SyntaxHighlighter language='json' className='w-full text-xs font-thin'>
        {JSON.stringify(field, null, 2)}
      </SyntaxHighlighter>
    </div>
  );
};

const meta: Meta<StoryProps> = {
  title: 'ui/react-ui-data/Form',
  component: Form,
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
    values: {
      property: 'currency' as JsonProp,
      format: FormatEnum.Currency,
      type: TypeEnum.Number,
    },
  },
};
