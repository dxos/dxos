//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React from 'react';

import { withLayout, withTheme } from '../../testing';

import { ErrorBoundary, ErrorFallback } from './ErrorFallback';

const ErrorGenerator = () => {
  throw new Error('This is a test error message');
};

const BasicStory = () => {
  return (
    <ErrorBoundary name='story' fallbackRender={ErrorFallback}>
      <ErrorGenerator />
    </ErrorBoundary>
  );
};

const StringErrorStory = () => {
  return <ErrorFallback error='This is a string error message' />;
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
  play: async () => {
    // This story intentionally renders an ErrorBoundary fallback; clear the smoke-test error flag.
    (window as any).__ERROR_BOUNDARY_ERRORS__ = [];
  },
};

export const StringError: Story = {
  render: StringErrorStory,
};
