//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';

import { AppAnnotation } from '@dxos/app-toolkit';
import { Annotation, Blob, DXN, Format, Obj, Ref, Type } from '@dxos/echo';
import { FormInlineAnnotation, LabelAnnotation } from '@dxos/echo/Annotation';
import { AtprotoRecordAnnotation, AtprotoVisibilityAnnotation, Text } from '@dxos/schema';

import { bookCodec, canPublishBook, inspectBook } from '../atproto';

/**
 * Reading status, mirroring the `buzz.bookhive.defs` known values
 * (`finished`/`reading`/`wantToRead`/`abandoned`). Stored bare; the codec maps it to/from the
 * `buzz.bookhive.defs#<value>` knownValue reference on the wire.
 */
export const Status = Schema.Literal('finished', 'reading', 'wantToRead', 'abandoned');
export type Status = Schema.Schema.Type<typeof Status>;

/**
 * External catalog identifiers for a book, mirroring `buzz.bookhive.defs#bookIdentifiers`. Each is an
 * id assigned by an external catalog — BookHive's `hiveId`, ISBNs, Goodreads. These are catalog data
 * (published), not ECHO sync foreign keys; `hiveId` is the one that gates publishing to BookHive.
 */
export const Identifiers = Schema.Struct({
  hiveId: Schema.optional(Schema.String.annotations({ title: 'BookHive ID' })),
  isbn10: Schema.optional(Schema.String.annotations({ title: 'ISBN-10' })),
  isbn13: Schema.optional(Schema.String.annotations({ title: 'ISBN-13' })),
  goodreadsId: Schema.optional(Schema.String.annotations({ title: 'Goodreads ID' })),
});
export type Identifiers = Schema.Schema.Type<typeof Identifiers>;

/**
 * Reading progress, mirroring `buzz.bookhive.defs#bookProgress`. Published — denormalized to the
 * record's `bookProgress`. `updatedAt` is required on the wire; the codec stamps it from the object's
 * creation time when unset so encoding stays deterministic.
 */
export const Progress = Schema.Struct({
  percent: Schema.optional(Schema.Number.pipe(Schema.int(), Schema.between(0, 100)).annotations({ title: 'Percent' })),
  currentPage: Schema.optional(
    Schema.Number.pipe(Schema.int(), Schema.positive()).annotations({ title: 'Current page' }),
  ),
  totalPages: Schema.optional(
    Schema.Number.pipe(Schema.int(), Schema.positive()).annotations({ title: 'Total pages' }),
  ),
  currentChapter: Schema.optional(
    Schema.Number.pipe(Schema.int(), Schema.positive()).annotations({ title: 'Current chapter' }),
  ),
  totalChapters: Schema.optional(
    Schema.Number.pipe(Schema.int(), Schema.positive()).annotations({ title: 'Total chapters' }),
  ),
  updatedAt: Schema.optional(Format.DateTime.annotations({ title: 'Updated' })),
  // Exact reading position (a foliate CFI) for precise restore. Private — kept for posterity but never
  // published: the `buzz.bookhive.defs#bookProgress` lexicon has no location anchor, and it is a
  // reader-local detail. The `private` override sits inside the otherwise-published `progress` struct.
  cfi: Schema.optional(Schema.String.annotations({ title: 'Location' }).pipe(AtprotoVisibilityAnnotation.set('private'))),
});
export type Progress = Schema.Schema.Type<typeof Progress>;

/**
 * Generic, standalone book metadata. Editable and not tied to any external catalog — BookHive is used
 * only to autofill it. The correspondence to a BookHive catalog record is `identifiers.hiveId`, one of
 * the external catalog identifiers (alongside ISBNs/Goodreads), and what gates publishing to BookHive.
 *
 * `title`/`authors`/`identifiers` are the subset denormalized to a published `buzz.bookhive.book`
 * record (marked `publish`); the remaining metadata (cover, genres, description, …) is mirrored —
 * the network sources it from BookHive's own catalog, not from our record.
 */
export const Catalog = Schema.Struct({
  title: Schema.String.annotations({ title: 'Title' }).pipe(AtprotoVisibilityAnnotation.set('publish')),
  authors: Schema.Array(Schema.String).annotations({ title: 'Authors' }).pipe(AtprotoVisibilityAnnotation.set('publish')),
  identifiers: Schema.optional(
    Identifiers.annotations({ title: 'Identifiers' }).pipe(AtprotoVisibilityAnnotation.set('publish')),
  ),
  cover: Schema.optional(Schema.String.annotations({ title: 'Cover URL' })),
  thumbnail: Schema.optional(Schema.String.annotations({ title: 'Thumbnail URL' })),
  description: Schema.optional(Schema.String.annotations({ title: 'Description' })),
  genres: Schema.optional(Schema.Array(Schema.String).annotations({ title: 'Genres' })),
  language: Schema.optional(Schema.String.annotations({ title: 'Language' })),
  numPages: Schema.optional(Schema.Number.pipe(Schema.int(), Schema.positive()).annotations({ title: 'Pages' })),
  publicationYear: Schema.optional(Schema.Number.pipe(Schema.int()).annotations({ title: 'Publication year' })),
  publisher: Schema.optional(Schema.String.annotations({ title: 'Publisher' })),
});
export type Catalog = Schema.Schema.Type<typeof Catalog>;

/**
 * A book in the user's reading list.
 *
 * The public face — everything marked `publish` via {@link AtprotoVisibilityAnnotation} — maps to a
 * `buzz.bookhive.book` record. The private face (notes, ownership, purchase details) is unmarked and
 * never crosses the publishing boundary. Catalog metadata is an inline {@link Catalog} struct (always
 * loaded, so `catalog.title` labels the book) rather than a separate object.
 */
export class Book extends Type.makeObject<Book>(DXN.make('org.dxos.type.book', '0.1.0'))(
  Schema.Struct({
    // Catalog metadata (first field); labels the book via `catalog.title`. Its published subset
    // (title/authors/identifiers) is marked on the struct's fields; the rest is mirrored (the network
    // sees it from the BookHive catalog by id, not from our record) rather than private.
    catalog: Catalog.pipe(FormInlineAnnotation.set(true), AtprotoVisibilityAnnotation.set('mirror')),

    // Published per-user reading state.
    status: Status.annotations({ title: 'Status' }).pipe(AtprotoVisibilityAnnotation.set('publish'), Schema.optional),
    stars: Schema.Number.pipe(
      Schema.int(),
      Schema.between(1, 10),
      Schema.annotations({ title: 'Rating', description: 'Rating from 1 to 10.' }),
      AtprotoVisibilityAnnotation.set('publish'),
      Schema.optional,
    ),
    review: Ref.Ref(Text.Text).pipe(
      AtprotoVisibilityAnnotation.set('publish'),
      // Edited as a markdown editor in the activity form; the codec maps markdown <-> HTML on the wire.
      Format.FormatAnnotation.set(Format.TypeFormat.Markdown),
      Schema.annotations({ title: 'Review' }),
      Schema.optional,
    ),
    // Reading dates are date-only in ECHO; the codec widens them to the wire's ISO datetime format.
    startedAt: Format.DateOnly.annotations({ title: 'Started' }).pipe(
      AtprotoVisibilityAnnotation.set('publish'),
      Schema.optional,
    ),
    finishedAt: Format.DateOnly.annotations({ title: 'Finished' }).pipe(
      AtprotoVisibilityAnnotation.set('publish'),
      Schema.optional,
    ),
    owned: Schema.Boolean.annotations({ title: 'Owned' }).pipe(AtprotoVisibilityAnnotation.set('publish'), Schema.optional),
    progress: Progress.annotations({ title: 'Progress' }).pipe(AtprotoVisibilityAnnotation.set('publish'), Schema.optional),

    // Private (ECHO-only) fields — unmarked, never published.
    notes: Ref.Ref(Text.Text)
      .annotations({ title: 'Private notes' })
      .pipe(FormInlineAnnotation.set(true), Schema.optional),
    purchasePrice: Format.Currency().annotations({ title: 'Purchase price' }).pipe(Schema.optional),
    purchaseDate: Format.DateOnly.annotations({ title: 'Purchase date' }).pipe(Schema.optional),
    shelfLocation: Schema.String.annotations({ title: 'Shelf location' }).pipe(Schema.optional),

    // Optional DRM-free copy of the book (PDF/EPUB/…), stored as a direct blob reference. Private —
    // never published to atproto. A future reader view renders it as an alternative to the metadata.
    content: Ref.Ref(Blob.Blob)
      .annotations({ title: 'Book file', description: 'A DRM-free copy of the book (PDF, EPUB, …).' })
      .pipe(Schema.optional),
  }).pipe(
    LabelAnnotation.set(['catalog.title']),
    Annotation.IconAnnotation.set({ icon: 'ph--book-open--regular', hue: 'indigo' }),
    AppAnnotation.CardAnnotation.set(true),
    AtprotoRecordAnnotation.set({
      collection: 'buzz.bookhive.book',
      rkey: 'tid',
      codec: bookCodec,
      canPublish: canPublishBook,
      inspect: inspectBook,
    }),
  ),
) {}

export const instanceOf = (value: unknown): value is Book => Obj.instanceOf(Book, value);

export type MakeProps = Omit<Partial<Obj.MakeProps<typeof Book>>, 'catalog'> & {
  catalog: { title: string; authors?: readonly string[] } & Partial<Omit<Catalog, 'title' | 'authors'>>;
};

/**
 * Create a book. `catalog.title` is required; `authors` defaults to empty. A BookHive `hiveId` (from an
 * autofill match) is set on `catalog.identifiers.hiveId`, alongside the other catalog identifiers.
 * `review`/`notes` default to fresh empty {@link Text} refs so their inline editors have a target (an
 * empty review is dropped by the codec, so it is never published).
 */
export const make = ({ catalog, review, notes, ...props }: MakeProps): Book =>
  Obj.make(Book, {
    catalog: { authors: [], ...catalog },
    review: review ?? Ref.make(Text.make({ content: '' })),
    notes: notes ?? Ref.make(Text.make({ content: '' })),
    ...props,
  });
