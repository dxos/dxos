//
// Copyright 2023 DXOS.org
//

import { Circle } from '@phosphor-icons/react';
import { FC, useMemo } from 'react';

import { searchMeta } from '@dxos/kai-frames';
import { Space, TypedObject, useQuery } from '@dxos/react-client/echo';

// TODO(burdon): Cyclic dependency.

export type SearchResult = {
  object: TypedObject;
  rank: number;
  Icon: FC<any>;
  title: string;
  snippet?: string[];
};

export type SearchResults = {
  text: string;
  results: SearchResult[];
};

const sortByRank = ({ rank: a }: SearchResult, { rank: b }: SearchResult) => (a < b ? 1 : a > b ? -1 : 0);

// TODO(burdon): Based on schema. Convert documents. to text.
const searchFields = ['title', 'name', 'description', 'content', 'subject', 'body', 'from.name'];

// TODO(burdon): Implement in echo schema.
const getProperty = (object: Object, path: string[]): string | undefined => {
  const value = (object as Record<string, any>)[path[0]];
  if (typeof value === 'string') {
    return value;
  } else if (typeof value === 'object') {
    return getProperty(value, path.slice(1));
  }
};

// TODO(burdon): Ranking via Lyra?
const matchFilter = (text: string) => {
  const str = text.trim().toLowerCase();
  return (object: TypedObject): SearchResult | undefined => {
    if (!str.length) {
      return;
    }

    if (object.__typename) {
      // TODO(burdon): Title fields.
      const title = (object as any).title ?? (object as any).name ?? (object as any).subject;

      // TODO(burdon): Factor out search filter.
      let match = false;
      let snippet: string[] = [];
      for (const field of searchFields) {
        const value = getProperty(object, field.split('.'));
        if (typeof value === 'string') {
          const idx = value?.toLowerCase().indexOf(str) ?? -1;
          if (idx !== -1) {
            match = true;
            if (value !== title) {
              snippet = [
                value.slice(Math.max(0, idx - 16), idx),
                value.slice(idx, idx + str.length),
                value.slice(idx + str.length),
              ];
            }
            break;
          }
        }
      }

      if (!match) {
        return;
      }

      if (title) {
        const meta = searchMeta[object.__typename];
        if (!meta) {
          return;
        }

        const { rank, Icon = Circle } = meta;
        return {
          object,
          rank,
          title,
          snippet,
          Icon,
        };
      }
    }
  };
};

export const useSearch = (space: Space | undefined, text: string): SearchResults => {
  // TODO(burdon): Search across spaces.
  const objects = useQuery(space); // TODO(burdon): Filter by type.
  const sorted = useMemo(
    () => (objects.map(matchFilter(text)).filter(Boolean) as SearchResult[]).sort(sortByRank),
    [objects, text],
  );

  return { text, results: sorted };
};
