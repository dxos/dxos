//
// Copyright 2024 DXOS.org
//

import '@dxos-theme';

import { type Meta, type StoryObj } from '@storybook/react';
import React, { useCallback, useState } from 'react';

import { FormatEnum, type JsonProp, TypeEnum } from '@dxos/echo-schema';
import { getPropertySchemaForFormat, type PropertyType } from '@dxos/schema';
import { withLayout, withTheme } from '@dxos/storybook-utils';

import { Form, type FormProps } from './Form';
import translations from '../../translations';
import { TestLayout, TestPanel } from '../testing';

type StoryProps = FormProps<PropertyType>;

const DefaultStory = ({ values }: StoryProps) => {
  const [field, setField] = useState(values);

  // TODO(ZaymonFC): Workout why this throws if you unwrap the object.
  const [{ schema }, setSchema] = useState({ schema: getPropertySchemaForFormat(field.format) });
  const handleValuesChanged = useCallback(
    (values: FormProps<PropertyType>['values']) => {
      // Update schema if format changed.
      setSchema({ schema: getPropertySchemaForFormat(values.format) });
    },
    [schema],
  );

  const handleSave = useCallback((field: any) => {
    console.log('handleSave', field);
    setField(field);
  }, []);

  if (!schema) {
    return <div>No schema found for format: {field.format}</div>;
  }

  return (
    <TestLayout json={{ field, schema: schema.ast.toJSON() }}>
      <TestPanel>
        <Form values={field} schema={schema} onValuesChanged={handleValuesChanged} onSave={handleSave} />
      </TestPanel>
    </TestLayout>
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
      // TODO(burdon): Incorrect value if specified here.
      // multipleOf: 0.01,
    },
  },
};

export const LatLng: Story = {
  args: {
    values: {
      property: 'location' as JsonProp,
      format: FormatEnum.LatLng,
      type: TypeEnum.Object,
    },
  },
};
