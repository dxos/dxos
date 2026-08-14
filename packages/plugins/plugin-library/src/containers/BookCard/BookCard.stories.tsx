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
type StoryArgs = { cover?: string; stars?: number; publicationYear?: number };

const meta = {
  title: 'plugins/plugin-library/BookCard',
  render: ({ cover, stars, publicationYear }: StoryArgs) => {
    const book = Book.make({
      catalog: {
        title: 'Dune',
        authors: ['Frank Herbert'],
        genres: ['Science Fiction'],
        identifiers: { hiveId: 'bk_dune' },
        cover,
        publicationYear,
      },
      stars,
    });
    return (
      <Card.Root>
        <Card.Header>
          <Card.Title>{book.catalog.title}</Card.Title>
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

export const WithCover: Story = {
  args: {
    cover: 'https://i.gr-assets.com/images/S/compressed.photo.goodreads.com/books/1555447414i/44767458.jpg',
    stars: 8,
    publicationYear: 1965,
  },
};

export const NoCover: Story = { args: { stars: 9, publicationYear: 1965 } };
