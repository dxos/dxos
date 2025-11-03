//
// Copyright 2025 DXOS.org
//

import * as Schema from 'effect/Schema';

// Types:
// Bookmark
// Article
// Wikipedia
// Organization
// Contact
// Project
// Email/Calendar
// Youtube

export const PageContent = Schema.Struct({
  url: Schema.String,
});

export type PageContent = Schema.Schema.Type<typeof PageContent>;

/**
 * Parse current page and create context object.
 */
// TODO(burdon): XSLT transform? Or JSONPath expressions.
export interface Parser {
  path: string;
  parse: (url: URL) => Promise<PageContent>;
}

const defaultParser: Parser = {
  path: '*',
  parse: async (url) => ({
    url: url.toString(),
  }),
};

const PARSERS: Parser[] = [
  {
    path: 'linkedin.com',
    parse: async (url) => ({
      url: url.toString(),
    }),
  },
];

/**
 * Map of dynamically loading parsers.
 */
const regisgtry: Record<string, Parser> = PARSERS.reduce<Record<string, Parser>>((map, parser) => {
  map[parser.path] = parser;
  return map;
}, {});

export const getParser = (url: URL): Parser =>
  // TODO(burdon): Find best match based on length of path.
  regisgtry[url.hostname] ?? defaultParser;
