//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React from 'react';

import { ErrorBoundary } from '@dxos/react-error-boundary';

import { withLayout, withTheme } from '../../testing';

import { ErrorFallback } from './ErrorFallback';
import { ThrowError } from './ThrowError';

const DefaultStory = () => {
  return (
    <ErrorBoundary name='story' FallbackComponent={ErrorFallback}>
      <ThrowError />
    </ErrorBoundary>
  );
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
  render: DefaultStory,
  play: async () => {
    // This story intentionally renders an ErrorBoundary fallback; clear the smoke-test error flag.
    (window as any).__ERROR_BOUNDARY_ERRORS__ = [];
  },
};

export const StringError: Story = {
  render: () => <ErrorFallback error='This is a string error message' data={{ context: 'story' }} />,
};
