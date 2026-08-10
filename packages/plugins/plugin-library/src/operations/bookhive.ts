//
// Copyright 2026 DXOS.org
//

import * as FetchHttpClient from '@effect/platform/FetchHttpClient';
import * as Effect from 'effect/Effect';
import * as Schema from 'effect/Schema';

import { htmlToMarkdown } from './html-markdown';
import { getJson } from './http';

const BOOKHIVE_XRPC = 'https://bookhive.buzz/xrpc';

/** External identifiers (`buzz.bookhive.defs#bookIdentifiers`); excess fields dropped on decode. */
const Identifiers = Schema.Struct({
  isbn10: Schema.optional(Schema.String),
  isbn13: Schema.optional(Schema.String),
  goodreadsId: Schema.optional(Schema.String),
});

/**
 * Subset of the `buzz.bookhive.hiveBook` record returned by `buzz.bookhive.searchBooks`.
 * Excess fields are dropped on decode.
 */
const HiveBook = Schema.Struct({
  id: Schema.String,
  title: Schema.String,
  authors: Schema.optional(Schema.String), // Tab-separated.
  thumbnail: Schema.optional(Schema.String),
  cover: Schema.optional(Schema.String),
  description: Schema.optional(Schema.String),
  genres: Schema.optional(Schema.Array(Schema.String)),
  language: Schema.optional(Schema.String),
  numPages: Schema.optional(Schema.Number),
  publicationYear: Schema.optional(Schema.Number),
  publisher: Schema.optional(Schema.String),
  identifiers: Schema.optional(Identifiers),
});

const SearchBooksResponse = Schema.Struct({
  books: Schema.optional(Schema.Array(HiveBook)),
});

export type FetchOptions = { corsProxy?: string };

/**
 * A search hit, normalized to the shape of `Book.Catalog` (authors split from the tab-separated
 * string) so the create flow can populate the embedded catalog directly.
 */
export type BookSuggestion = {
  hiveId: string;
  title: string;
  authors: string[];
  coverUrl?: string;
  thumbnail?: string;
  description?: string;
  genres: string[];
  identifiers?: { isbn10?: string; isbn13?: string; goodreadsId?: string };
  language?: string;
  numPages?: number;
  publicationYear?: number;
  publisher?: string;
  hiveBookUri?: string;
};

const splitAuthors = (authors?: string): string[] =>
  authors
    ? authors
        .split('\t')
        .map((author) => author.trim())
        .filter(Boolean)
    : [];

const toSuggestion = (book: Schema.Schema.Type<typeof HiveBook>): BookSuggestion => ({
  hiveId: book.id,
  title: book.title,
  authors: splitAuthors(book.authors),
  coverUrl: book.cover ?? book.thumbnail,
  thumbnail: book.thumbnail,
  description: htmlToMarkdown(book.description),
  genres: book.genres ? [...book.genres] : [],
  identifiers: book.identifiers ? { ...book.identifiers } : undefined,
  language: book.language,
  numPages: book.numPages,
  publicationYear: book.publicationYear,
  publisher: book.publisher,
});

const searchEndpoint = (query: string, limit: number): string =>
  `${BOOKHIVE_XRPC}/buzz.bookhive.searchBooks?q=${encodeURIComponent(query)}&limit=${limit}`;

const lookupEndpoint = (hiveId: string): string =>
  `${BOOKHIVE_XRPC}/buzz.bookhive.searchBooks?id=${encodeURIComponent(hiveId)}&limit=1`;

/**
 * Search the public BookHive catalog. Always succeeds (empty on blank/failed query) so it can back a
 * combobox lookup.
 */
export const searchBooks = (query: string, options?: FetchOptions): Effect.Effect<BookSuggestion[], never> =>
  query.trim().length === 0
    ? Effect.succeed([])
    : getJson(SearchBooksResponse, searchEndpoint(query.trim(), 8), options?.corsProxy).pipe(
        Effect.map((response) => (response.books ?? []).map(toSuggestion)),
        Effect.orElseSucceed((): BookSuggestion[] => []),
        Effect.provide(FetchHttpClient.layer),
      );

/**
 * Resolve a single catalog book by its hive id (used to autofill the create form after selection).
 */
export const lookupHiveBook = (
  hiveId: string,
  options?: FetchOptions,
): Effect.Effect<BookSuggestion | undefined, never> =>
  hiveId.trim().length === 0
    ? Effect.succeed(undefined)
    : getJson(SearchBooksResponse, lookupEndpoint(hiveId.trim()), options?.corsProxy).pipe(
        Effect.map((response) => (response.books ?? []).map(toSuggestion)[0]),
        Effect.orElseSucceed((): BookSuggestion | undefined => undefined),
        Effect.provide(FetchHttpClient.layer),
      );
