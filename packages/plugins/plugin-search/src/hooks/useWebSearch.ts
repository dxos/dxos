//
// Copyright 2025 DXOS.org
//

import { useCallback, useState } from 'react';

import { EXA_API_KEY } from '@dxos/ai/testing';
import { Obj } from '@dxos/echo';
import { log } from '@dxos/log';
import { getIconAnnotation } from '@dxos/schema';
import { TestSchema } from '@dxos/schema/testing';

import { search } from '../search';
import { type SearchResult } from '../types';

import { getStringProperty } from './sync';

export type UseWebSearchProps = {
  query?: string;
  context?: string;
};

export type UseWebSearch = {
  update: () => Promise<void>;
  results: SearchResult[];
  isLoading: boolean;
};

/** @deprecated */
// TODO(burdon): Remove testing deps.
export const useWebSearch = ({ query, context }: UseWebSearchProps): UseWebSearch => {
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const update = useCallback(async () => {
    try {
      setIsLoading(true);
      log.info('Running web search', { query, context });
      const results = await search({
        query,
        context,
        schema: [TestSchema.Person, TestSchema.Project, TestSchema.Organization], // TODO(burdon): ???
        exaApiKey: EXA_API_KEY,
      });

      const mappedResults = results.data.map((result): SearchResult => {
        const schema = Obj.getSchema(result);
        return {
          id: result.id,
          label: getStringProperty(result, ['name', 'title', 'label']),
          snippet: getStringProperty(result, ['description', 'content', 'website', 'email']),
          object: result,
          icon: schema?.pipe(getIconAnnotation),
        };
      });

      setResults(mappedResults);
    } finally {
      setIsLoading(false);
    }
  }, [query, context]);

  return { update, results, isLoading };
};
