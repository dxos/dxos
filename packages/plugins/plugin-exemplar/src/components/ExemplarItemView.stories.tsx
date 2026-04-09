//
// Copyright 2025 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useCallback, useState } from 'react';

import { withLayout, withTheme } from '@dxos/react-ui/testing';

import { translations } from '../translations';
import { ExemplarItemView, type ExemplarItemViewProps } from './ExemplarItemView';

type StatusValue = 'active' | 'archived' | 'draft';

const DefaultStory = (props: ExemplarItemViewProps) => {
  const [values, setValues] = useState({
    name: props.name,
    description: props.description,
    status: props.status,
  });

  const handleValuesChanged = useCallback((changed: Record<string, unknown>) => {
    setValues((prev) => ({ ...prev, ...changed }));
  }, []);

  return (
    <ExemplarItemView
      name={values.name}
      description={values.description}
      status={values.status as StatusValue}
      onValuesChanged={handleValuesChanged}
    />
  );
};

const meta = {
  title: 'plugins/plugin-exemplar/ExemplarItemView',
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
    description: 'A sample exemplar item for demonstration purposes.',
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
