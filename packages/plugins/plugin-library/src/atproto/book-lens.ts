//
// Copyright 2026 DXOS.org
//

import { Obj, Ref } from '@dxos/echo';
import { Panproto } from '@dxos/echo-panproto';
import { Text } from '@dxos/schema';

import { htmlToMarkdown, markdownToHtml } from '../operations/html-markdown';

// BookHive's catalog service account, which owns the canonical `buzz.bookhive.catalogBook` records. The
// published book's `hiveBookUri` points here (its rkey is the hive id) — how BookHive associates the record.
const BOOKHIVE_SERVICE_DID = 'did:plc:enu2j5xjlqsjaylv3du4myh4';

// Register the ECHO-specific codecs the book lens references by name. A module side-effect (plugin-library
// is `sideEffects: true`, so it is retained): the wire carries the review as HTML while ECHO holds markdown,
// and review/notes are `Ref<Text>` on the ECHO side but plain strings on the wire.
Panproto.registerTextFormat('markdown-html', {
  encode: (markdown) => markdownToHtml(markdown) ?? '',
  decode: (html) => htmlToMarkdown(html) ?? '',
});
Panproto.registerRefType('text', {
  read: async (ref) => {
    if (!Ref.isRef(ref)) {
      return undefined;
    }
    const target = await ref.load();
    return Obj.instanceOf(Text.Text, target) ? target.content : undefined;
  },
  make: (content) => Ref.make(Text.make({ content })),
});

/**
 * The declarative Book <-> `buzz.bookhive.book` lens. Every wire field is an adapter mapping it to/from
 * the ECHO object: the catalog subset is denormalized onto the record (title/authors/identifiers), the
 * `review` `Ref<Text>` resolves to the wire's HTML, `status` is prefixed to its knownValue reference,
 * dates widen to the wire's ISO datetime, `progress` nests as `bookProgress`, and `hiveBookUri` is
 * synthesized from the hive id. Private/ECHO-only fields (notes, content, purchase*, `progress.cfi`) have
 * no adapter and never cross the boundary — the egress gate.
 */
export const bookLens: Panproto.Lens = {
  adapters: [
    { kind: 'scalar', wire: 'title', echo: ['catalog', 'title'] },
    { kind: 'array', wire: 'authors', echo: ['catalog', 'authors'], separator: '\t' },
    // The required top-level hive id (the canonical dedup key), denormalized from the catalog identifiers.
    { kind: 'scalar', wire: 'hiveId', echo: ['catalog', 'identifiers', 'hiveId'] },
    // `createdAt` is required by the lexicon and injected from the object's creation timestamp.
    { kind: 'meta', wire: 'createdAt', metaField: 'createdAt' },
    { kind: 'prefix', wire: 'status', echo: ['status'], prefix: 'buzz.bookhive.defs#' },
    { kind: 'scalar', wire: 'stars', echo: ['stars'] },
    { kind: 'ref', wire: 'review', echo: ['review'], ref: { refType: 'text', format: 'markdown-html', alwaysCreate: true } },
    { kind: 'dateOnly', wire: 'startedAt', echo: ['startedAt'] },
    { kind: 'dateOnly', wire: 'finishedAt', echo: ['finishedAt'] },
    { kind: 'scalar', wire: 'owned', echo: ['owned'] },
    {
      kind: 'struct',
      wire: 'bookProgress',
      fields: [
        { kind: 'scalar', wire: 'percent', echo: ['progress', 'percent'] },
        { kind: 'scalar', wire: 'totalPages', echo: ['progress', 'totalPages'] },
        { kind: 'scalar', wire: 'currentPage', echo: ['progress', 'currentPage'] },
        { kind: 'scalar', wire: 'totalChapters', echo: ['progress', 'totalChapters'] },
        { kind: 'scalar', wire: 'currentChapter', echo: ['progress', 'currentChapter'] },
        // `updatedAt` is required on the wire; stamp deterministically from creation time when unset.
        { kind: 'timestamp', wire: 'updatedAt', echo: ['progress', 'updatedAt'], fallbackMeta: 'createdAt' },
      ],
    },
    {
      kind: 'struct',
      wire: 'identifiers',
      fields: [
        { kind: 'scalar', wire: 'hiveId', echo: ['catalog', 'identifiers', 'hiveId'] },
        { kind: 'scalar', wire: 'isbn10', echo: ['catalog', 'identifiers', 'isbn10'] },
        { kind: 'scalar', wire: 'isbn13', echo: ['catalog', 'identifiers', 'isbn13'] },
        { kind: 'scalar', wire: 'goodreadsId', echo: ['catalog', 'identifiers', 'goodreadsId'] },
      ],
    },
    // Link to the canonical BookHive catalog record; the catalogBook rkey is the hive id.
    {
      kind: 'derive',
      wire: 'hiveBookUri',
      from: ['catalog', 'identifiers', 'hiveId'],
      template: `at://${BOOKHIVE_SERVICE_DID}/buzz.bookhive.catalogBook/{0}`,
    },
  ],
};
