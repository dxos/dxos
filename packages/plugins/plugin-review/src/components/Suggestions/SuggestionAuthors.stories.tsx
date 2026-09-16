//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useState } from 'react';

import { withLayout, withTheme } from '@dxos/react-ui/testing';

import { translations } from '#translations';

import { SuggestionAuthors, type SuggestionAuthorsProps } from './SuggestionAuthors.tsx';

const AUTHORS: SuggestionAuthorsProps['authors'] = [
  { author: 'did:alice', label: 'Alice Mercer', hue: 'violet', hidden: false },
  { author: 'did:bob', label: 'Bob Chen', hue: 'amber', hidden: true },
  { author: 'did:carol', label: 'Carol Diaz', hue: 'emerald', hidden: false },
];

const DefaultStory = ({ authors }: Pick<SuggestionAuthorsProps, 'authors'>) => {
  const [state, setState] = useState(authors);
  const handleToggle = (author: string) =>
    setState((current) => current.map((row) => (row.author === author ? { ...row, hidden: !row.hidden } : row)));

  return <SuggestionAuthors authors={state} onToggle={handleToggle} />;
};

const meta = {
  title: 'plugins/plugin-review/components/SuggestionAuthors',
  render: DefaultStory,
  decorators: [withTheme(), withLayout()],
  parameters: {
    translations,
  },
} satisfies Meta<typeof DefaultStory>;

export default meta;

type Story = StoryObj<typeof meta>;

/**
 * Test:
 * 1. One chip per author in their palette hue; hidden authors show the slashed eye.
 * 2. Click a chip: its eye icon and pressed state flip.
 */
export const Default: Story = {
  args: {
    authors: AUTHORS,
  },
};
