//
// Copyright 2025 DXOS.org
//

import * as Schema from 'effect/Schema';

import { type Database, Filter, Query } from '@dxos/echo';
import { EID, EntityId } from '@dxos/keys';

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

export type FindReferencesOptions = {
  /** Search backend. Full-text matches proper nouns precisely; vector matches semantically. */
  searchKind?: 'full-text' | 'vector';
};

/**
 * Finds the best-matching context object for each noun and returns it as a reference.
 */
export const findReferences = async (
  nouns: string[],
  db: Database.Database,
  { searchKind = 'full-text' }: FindReferencesOptions = {},
): Promise<ReferencedQuotes> => {
  const references = await Promise.all(
    nouns.map(async (noun) => {
      const objects = await db.query(Query.select(Filter.text(noun, { type: searchKind }))).run();
      return objects.length > 0 ? [{ id: objects[0].id.toString(), quote: noun }] : [];
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
    if (!EntityId.isValid(quote.id)) {
      continue;
    }

    // Use a case-insensitive regular expression to replace the quote.
    const regex = new RegExp(quote.quote.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
    text = text.replace(regex, `[${quote.quote}](${EID.make({ entityId: quote.id })})`);
  }

  return text;
};
