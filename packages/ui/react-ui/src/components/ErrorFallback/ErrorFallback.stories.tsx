//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React from 'react';

import { withLayout, withTheme } from '../../testing';

import { ErrorFallback } from './ErrorFallback';

const BasicStory = () => {
  return (
    <ErrorFallback error={new Error('This is a test error message')} resetErrorBoundary={() => console.log('reset')} />
  );
};

const StringErrorStory = () => {
  return <ErrorFallback error='This is a string error message' resetErrorBoundary={() => console.log('reset')} />;
};

const meta: Meta = {
  title: 'ui/react-ui-core/components/ErrorFallback',
  component: ErrorFallback,
  decorators: [withTheme(), withLayout({ layout: 'column' })],
  parameters: {
    layout: 'fullscreen',
  },
};

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: BasicStory,
};

export const StringError: Story = {
  render: StringErrorStory,
};
