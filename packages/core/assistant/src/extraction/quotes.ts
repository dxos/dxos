//
// Copyright 2025 DXOS.org
//

import * as Schema from 'effect/Schema';

import { Filter, Query } from '@dxos/echo';
import { ObjectId } from '@dxos/echo/internal';
import { type EchoDatabase } from '@dxos/echo-db';
import { DXN } from '@dxos/keys';
import { log } from '@dxos/log';

export const ReferencedQuotes = Schema.Struct({
  references: Schema.Array(
    Schema.Struct({
      id: Schema.String,
      quote: Schema.String, // TODO(burdon): Quote?
    }),
  )
    .pipe(Schema.mutable)
    .annotations({
      // TODO(burdon): Does this description make sense?
      description: `
      The references to the context objects that are mentioned in the transcript. 
      Quote should match the original transcript text exactly, while id is the id of the context object.
    `,
    }),
});
export type ReferencedQuotes = Schema.Schema.Type<typeof ReferencedQuotes>;

export const findQuotes = async (quotes: string[], db: EchoDatabase): Promise<ReferencedQuotes> => {
  const references = await Promise.all(
    quotes.map(async (quote) => {
      const { objects } = await db.query(Query.select(Filter.text(quote, { type: 'vector' }))).run();
      log.info('found quotes in vector index', { objects, quote });
      return objects.length > 0 ? [{ id: objects[0].id.toString(), quote }] : [];
    }),
  );
  return { references: references.flat() };
};

/**
 * Finds and replaces all quotes with DXNs references.
 */
// TODO(dmaretskyi): Lookup and verifiy ids from provided context.
export const insertReferences = (text: string, quotes: ReferencedQuotes) => {
  for (const quote of quotes.references) {
    if (!ObjectId.isValid(quote.id)) {
      continue;
    }

    // Use a case-insensitive regular expression to replace the quote.
    const regex = new RegExp(quote.quote.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
    text = text.replace(regex, `[${quote.quote}](${DXN.fromLocalObjectId(quote.id).toString()})`);
  }

  return text;
};
