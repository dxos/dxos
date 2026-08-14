//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React from 'react';

import { withLayout, withTheme } from '@dxos/react-ui/testing';

import { Book } from '#types';

import { BookArticle } from './BookArticle';

const meta = {
  title: 'plugins/plugin-library/BookArticle',
  // Build the object inside `render` (never pass a reactive ECHO object as a story arg). A catalog-rich
  // book so the read-only Info view (cover, rating, publication line, genres, description) renders in full.
  render: () => {
    const book = Book.make({
      catalog: {
        title: 'The City & the City',
        authors: ['China Miéville'],
        cover: 'https://i.gr-assets.com/images/S/compressed.photo.goodreads.com/books/1385480585i/968.jpg',
        publicationYear: 2009,
        publisher: 'Del Rey/Ballantine Books',
        language: 'English',
        numPages: 336,
        genres: ['Fantasy', 'Fiction', 'Science Fiction', 'Mystery', 'Crime'],
        identifiers: { hiveId: 'bk_orPg4NP9e8dlLosjaFj5', goodreadsId: '968' },
        description:
          'When a murdered woman is found in the city of Beszel, somewhere at the edge of Europe, it looks to be a routine case for Inspector Tyador Borlú of the Extreme Crime Squad. But as he investigates, the evidence points to conspiracies far stranger and more deadly than anything he could have imagined.',
      },
      status: 'reading',
      stars: 8,
      owned: true,
      startedAt: '2026-06-21',
    });
    return <BookArticle subject={book} role='article' attendableId={book.id} />;
  },
  decorators: [withTheme(), withLayout({ layout: 'fullscreen' })],
  parameters: { layout: 'fullscreen' },
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

export const Cataloged: Story = {};
