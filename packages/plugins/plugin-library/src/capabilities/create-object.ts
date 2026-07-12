//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Schema from 'effect/Schema';

import { Capability } from '@dxos/app-framework';
import { Operation } from '@dxos/compute';
import { Type } from '@dxos/echo';
import { SpaceCapabilities, SpaceOperation } from '@dxos/plugin-space';
import { AutofillAnnotation, OptionsLookupAnnotation, autofill, optionsLookup } from '@dxos/react-ui-form';

import { Book } from '#types';

import { lookupHiveBook, searchBooks } from '../operations/bookhive';
import { browserCorsProxy } from '../operations/cors';

type CreateBookValues = {
  hiveId?: string;
  title?: string;
  status?: Book.Status;
};

const CreateBook = Schema.Struct({
  // Combobox over the BookHive catalog. Typing queries titles; the selected option's value is the hive id.
  hiveId: Schema.optional(
    Schema.String.annotations({ title: 'Book' }).pipe(
      OptionsLookupAnnotation.set(
        optionsLookup<CreateBookValues>()(
          ['hiveId'],
          ({ hiveId }) =>
            searchBooks(hiveId ?? '', { corsProxy: browserCorsProxy() }).pipe(
              Effect.map((suggestions) =>
                suggestions.map((suggestion) => ({
                  value: suggestion.hiveId,
                  label: suggestion.title,
                  secondaryLabel: suggestion.authors.join(', '),
                })),
              ),
            ),
          { combobox: true },
        ),
      ),
    ),
  ),
  // Prefilled from the selected catalog book; remains user-editable (and required to create).
  title: Schema.optional(
    Schema.String.annotations({ title: 'Title' }).pipe(
      AutofillAnnotation.set(
        autofill<CreateBookValues>()(['hiveId'], ({ hiveId }) =>
          hiveId
            ? lookupHiveBook(hiveId, { corsProxy: browserCorsProxy() }).pipe(
                Effect.map((suggestion) => suggestion?.title),
              )
            : Effect.succeed(undefined),
        ),
      ),
    ),
  ),
  status: Schema.optional(Book.Status.annotations({ title: 'Status' })),
});

export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    return Capability.contributes(SpaceCapabilities.CreateObjectEntry, {
      id: Type.getTypename(Book.Book),
      inputSchema: CreateBook,
      // The embedded catalog is filled from the selected hive book on submit; its `hiveId` is what
      // makes the book publishable (a custom book with no catalog match has none).
      createObject: (props, options) =>
        Effect.gen(function* () {
          const suggestion = props.hiveId
            ? yield* lookupHiveBook(props.hiveId, { corsProxy: browserCorsProxy() })
            : undefined;
          const object = Book.make({
            catalog: {
              title: props.title ?? suggestion?.title ?? '(untitled)',
              authors: suggestion?.authors ?? [],
              cover: suggestion?.coverUrl,
              thumbnail: suggestion?.thumbnail,
              description: suggestion?.description,
              genres: suggestion?.genres,
              // The hive id is a catalog identifier (what gates publishing), alongside ISBN/Goodreads.
              identifiers: props.hiveId
                ? { hiveId: props.hiveId, ...suggestion?.identifiers }
                : suggestion?.identifiers,
              language: suggestion?.language,
              numPages: suggestion?.numPages,
              publicationYear: suggestion?.publicationYear,
              publisher: suggestion?.publisher,
            },
            status: props.status,
          });
          return yield* Operation.invoke(SpaceOperation.AddObject, {
            object,
            target: options.target,
            targetNodeId: options.targetNodeId,
          });
        }),
    });
  }),
);
