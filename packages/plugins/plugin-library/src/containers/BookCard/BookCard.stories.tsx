//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React from 'react';

import { Card } from '@dxos/react-ui';
import { withLayout, withTheme } from '@dxos/react-ui/testing';

import { Book } from '#types';

import { BookCard } from './BookCard';

// NOTE: build the ECHO object inside `render` — never pass a reactive ECHO object as a story `arg`,
// since Storybook deep-traverses/mutates args (which the ECHO proxy rejects outside `Obj.update`).
type StoryArgs = { status: Book.Status; stars?: number; review?: string; coverUrl?: string };

const meta = {
  title: 'plugins/plugin-library/BookCard',
  render: ({ status, stars, review, coverUrl }: StoryArgs) => {
    const book = Book.makeBook({ title: 'Dune', authors: ['Frank Herbert'], genres: ['Science Fiction'], status, stars, review, coverUrl });
    return (
      <Card.Root>
        <Card.Header>
          <Card.Title>{book.title}</Card.Title>
        </Card.Header>
        <BookCard subject={book} />
      </Card.Root>
    );
  },
  decorators: [withTheme(), withLayout()],
  parameters: { layout: 'centered' },
} satisfies Meta<StoryArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Finished: Story = {
  args: {
    status: 'finished',
    stars: 9,
    review: 'A landmark of science fiction.',
    coverUrl: 'https://i.gr-assets.com/images/S/compressed.photo.goodreads.com/books/1555447414i/44767458.jpg',
  },
};

export const Reading: Story = { args: { status: 'reading' } };
