//
// Copyright 2025 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useCallback, useState } from 'react';

import { withLayout, withTheme } from '@dxos/react-ui/testing';

import { translations } from '../translations';
import { SampleItemView, type SampleItemViewProps } from './SampleItemView';

type StatusValue = 'active' | 'archived' | 'draft';

const DefaultStory = (props: SampleItemViewProps) => {
  const [values, setValues] = useState({
    name: props.name,
    description: props.description,
    status: props.status,
  });

  const handleValuesChanged = useCallback((changed: Record<string, unknown>) => {
    setValues((prev) => ({ ...prev, ...changed }));
  }, []);

  return (
    <SampleItemView
      name={values.name}
      description={values.description}
      status={values.status as StatusValue}
      onValuesChanged={handleValuesChanged}
    />
  );
};

const meta = {
  title: 'plugins/plugin-sample/SampleItemView',
  component: DefaultStory,
  decorators: [withTheme(), withLayout({ layout: 'centered' })],
  parameters: {
    translations,
  },
} satisfies Meta<typeof DefaultStory>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    name: 'Example Item',
    description: 'A sample item for demonstration purposes.',
    status: 'active',
  },
};

export const Empty: Story = {
  args: {},
};

export const Archived: Story = {
  args: {
    name: 'Old Item',
    description: 'This item has been archived.',
    status: 'archived',
  },
};
