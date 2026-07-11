//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';

import { AppAnnotation } from '@dxos/app-toolkit';
import { Annotation, Blob, DXN, Obj, Ref, Type } from '@dxos/echo';
import { FormInputAnnotation, LabelAnnotation } from '@dxos/echo/Annotation';
import { AtprotoPublishAnnotation, AtprotoRecordAnnotation } from '@dxos/schema';

import { bookCodec } from '../atproto';

/**
 * Reading status, mirroring the `buzz.bookhive.defs` known values.
 */
export const Status = Schema.Literal('finished', 'reading', 'wantToRead', 'abandoned');
export type Status = Schema.Schema.Type<typeof Status>;

/**
 * A book in the user's reading list.
 *
 * The public face — everything marked {@link AtprotoPublishAnnotation} — maps to a
 * `buzz.bookhive.book` record. The private face (notes, ownership, personal tags) is unmarked and
 * never crosses the publishing boundary.
 */
export class Book extends Type.makeObject<Book>(DXN.make('org.dxos.type.book', '0.1.0'))(
  Schema.Struct({
    // Public (catalog-eligible) fields.
    title: Schema.String.annotations({ title: 'Title' }).pipe(AtprotoPublishAnnotation.set(true)),
    authors: Schema.Array(Schema.String)
      .annotations({ title: 'Authors' })
      .pipe(AtprotoPublishAnnotation.set(true)),
    status: Status.annotations({ title: 'Status' }).pipe(AtprotoPublishAnnotation.set(true), Schema.optional),
    stars: Schema.Number.pipe(
      Schema.int(),
      Schema.between(1, 10),
      Schema.annotations({ title: 'Rating', description: 'Rating from 1 to 10.' }),
      AtprotoPublishAnnotation.set(true),
      Schema.optional,
    ),
    review: Schema.String.annotations({ title: 'Review' }).pipe(AtprotoPublishAnnotation.set(true), Schema.optional),
    startedAt: Schema.String.annotations({ title: 'Started' }).pipe(
      AtprotoPublishAnnotation.set(true),
      Schema.optional,
    ),
    finishedAt: Schema.String.annotations({ title: 'Finished' }).pipe(
      AtprotoPublishAnnotation.set(true),
      Schema.optional,
    ),
    hiveId: Schema.String.annotations({ title: 'Hive ID' }).pipe(AtprotoPublishAnnotation.set(true), Schema.optional),
    hiveBookUri: Schema.String.annotations({ title: 'Hive book URI' }).pipe(
      AtprotoPublishAnnotation.set(true),
      FormInputAnnotation.set(false),
      Schema.optional,
    ),

    // Public info, but NOT part of the buzz.bookhive.book record (sourced from the hive book), so
    // unmarked: they do not cross the publishing boundary. Optional so a record imported from the PDS
    // (which has no genres) constructs cleanly.
    genres: Schema.Array(Schema.String).annotations({ title: 'Genres' }).pipe(Schema.optional),
    coverUrl: Schema.String.annotations({ title: 'Cover URL' }).pipe(Schema.optional),

    // Private (ECHO-only) fields — unmarked, never published.
    notes: Schema.String.annotations({ title: 'Private notes' }).pipe(Schema.optional),
    owned: Schema.Boolean.annotations({ title: 'Owned' }).pipe(Schema.optional),
    format: Schema.String.annotations({ title: 'Format' }).pipe(Schema.optional),
    purchasePrice: Schema.Number.annotations({ title: 'Purchase price' }).pipe(Schema.optional),
    purchaseDate: Schema.String.annotations({ title: 'Purchase date' }).pipe(Schema.optional),
    shelfLocation: Schema.String.annotations({ title: 'Shelf location' }).pipe(Schema.optional),
    personalTags: Schema.Array(Schema.String).annotations({ title: 'Personal tags' }).pipe(Schema.optional),

    // Optional DRM-free copy of the book (PDF/EPUB/…), stored as a direct blob reference. Private —
    // never published to atproto. A future reader view renders it as an alternative to the metadata.
    content: Ref.Ref(Blob.Blob)
      .annotations({ title: 'Book file', description: 'A DRM-free copy of the book (PDF, EPUB, …).' })
      .pipe(Schema.optional),
  }).pipe(
    LabelAnnotation.set(['title']),
    Annotation.IconAnnotation.set({ icon: 'ph--book-open--regular', hue: 'amber' }),
    AppAnnotation.CardAnnotation.set(true),
    AtprotoRecordAnnotation.set({ collection: 'buzz.bookhive.book', rkey: 'tid', codec: bookCodec }),
  ),
) {}

export const instanceOf = (value: unknown): value is Book => Obj.instanceOf(Book, value);

export type MakeProps = { title: string } & Partial<Obj.MakeProps<typeof Book>>;

export const makeBook = ({ authors = [], genres = [], personalTags = [], ...props }: MakeProps): Book =>
  Obj.make(Book, { authors, genres, personalTags, ...props });
