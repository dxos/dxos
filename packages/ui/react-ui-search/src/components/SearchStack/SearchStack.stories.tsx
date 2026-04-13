//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useMemo } from 'react';

import { withAttention } from '@dxos/react-ui-attention/testing';
import { withMosaic } from '@dxos/react-ui-mosaic/testing';
import { withLayout, withTheme } from '@dxos/react-ui/testing';

import { type SearchResult } from '../../types';
import { SearchStack, type SearchStackProps } from './SearchStack';

const createMockResults = (count: number): SearchResult[] => {
  return Array.from({ length: count }, (_, index) => ({
    id: `result-${index}`,
    label: `Search Result ${index + 1}`,
    snippet: index % 2 === 0 ? `This is a preview snippet for result ${index + 1}.` : undefined,
    type: index % 3 === 0 ? 'document' : index % 3 === 1 ? 'contact' : 'project',
  }));
};

const SearchStackStory = (props: Omit<SearchStackProps, 'id' | 'results'>) => {
  const results = useMemo(() => createMockResults(50), []);
  return <SearchStack id='story' results={results} {...props} />;
};

const meta: Meta<typeof SearchStackStory> = {
  title: 'ui/react-ui-search/SearchStack',
  component: SearchStackStory,
  parameters: {
    layout: 'fullscreen',
  },
};

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  decorators: [withTheme(), withLayout({ layout: 'column' }), withAttention(), withMosaic()],
};

export const Responsive: Story = {
  decorators: [withTheme(), withLayout({ layout: 'column', classNames: 'w-[30rem]' }), withAttention(), withMosaic()],
};
