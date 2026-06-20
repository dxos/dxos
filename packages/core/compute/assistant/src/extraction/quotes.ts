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
  // Deduplicate and process longer nouns first: `insertReferences` rewrites case-insensitive
  // substrings, so a repeated or shorter overlapping noun would re-replace already-linked text and
  // produce nested/broken markdown links.
  const normalizedNouns = Array.from(new Set(nouns.map((noun) => noun.trim()).filter((noun) => noun.length > 0))).sort(
    (leftNoun, rightNoun) => rightNoun.length - leftNoun.length,
  );

  const references = await Promise.all(
    normalizedNouns.map(async (noun) => {
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
export const insertReferences = (text: string, quotes: ReferencedQuotes): string => {
  // Process longer quotes first so e.g. "Sarah Johnson" is linked before "Sarah". Combined with the
  // link-aware replacement below this stops a shorter or overlapping quote from rewriting text that
  // is already part of an inserted link (which would produce nested `[[..](..)](..)` markdown).
  const references = quotes.references
    .filter((quote) => EntityId.isValid(quote.id))
    .sort((left, right) => right.quote.length - left.quote.length);

  for (const quote of references) {
    // Case-insensitive match of the (regex-escaped) quote.
    const regex = new RegExp(quote.quote.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
    text = replaceOutsideLinks(text, regex, `[${quote.quote}](${EID.make({ entityId: quote.id })})`);
  }

  return text;
};

const MARKDOWN_LINK = /\[[^\]]*\]\([^)]*\)/g;

/** Applies a replacement to every span of `text` that is not already inside a `[label](url)` link. */
const replaceOutsideLinks = (text: string, regex: RegExp, replacement: string): string => {
  let result = '';
  let plainStart = 0;
  for (const link of text.matchAll(MARKDOWN_LINK)) {
    const index = link.index ?? 0;
    result += text.slice(plainStart, index).replace(regex, replacement) + link[0];
    plainStart = index + link[0].length;
  }
  return result + text.slice(plainStart).replace(regex, replacement);
};
