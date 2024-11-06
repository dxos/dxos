//
// Copyright 2024 DXOS.org
//

import '@dxos-theme';

import { type Meta, type StoryObj } from '@storybook/react';
import React, { useCallback, useState } from 'react';

import { FormatEnum, ScalarEnum } from '@dxos/echo-schema';
import { SyntaxHighlighter } from '@dxos/react-ui-syntax-highlighter';
import { getPropertySchemaForFormat, type Property } from '@dxos/schema';
import { withLayout, withTheme } from '@dxos/storybook-utils';

import { Field, type FieldProps } from './Field';
import translations from '../../translations';
import { TestPopup } from '../testing';

const DefaultStory = (props: { field: FieldProps<Property>['field'] }) => {
  const [field, setField] = useState(props.field);
  // TODO(ZaymonFC): Workout why this throws if you unwrap the object.
  const [{ schema }, setSchema] = useState({ schema: getPropertySchemaForFormat(field.format) });

  const handleValueChange = useCallback((values: FieldProps<Property>['field']) => {
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
          <Field field={field} schema={schema} onValuesChanged={handleValueChange} onSave={handleSave} />
        </TestPopup>
      </div>
      <SyntaxHighlighter className='w-full text-xs'>{JSON.stringify(field, null, 2)}</SyntaxHighlighter>
    </div>
  );
};

const meta: Meta<typeof Field> = {
  title: 'ui/react-ui-data/Field',
  component: Field,
  render: DefaultStory,
  decorators: [withLayout({ fullscreen: true }), withTheme],
  parameters: {
    translations,
  },
};

export default meta;

type Story = StoryObj<typeof Field>;

export const Default: Story = {
  args: {
    field: { format: FormatEnum.Currency, property: 'currency', type: ScalarEnum.Number },
  },
};
