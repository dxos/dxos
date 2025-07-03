//
// Copyright 2025 DXOS.org
//

import { useState } from 'react';

import { EdgeAiServiceClient } from '@dxos/ai';
import { AI_SERVICE_ENDPOINT, EXA_API_KEY } from '@dxos/ai/testing';
import { Obj } from '@dxos/echo';
import { type DXN } from '@dxos/keys';
import { log } from '@dxos/log';
import { getIconAnnotation } from '@dxos/schema';
import { Testing } from '@dxos/schema/testing';

import { getStringProperty } from './sync';
import { search } from '../search';
import { type SearchResult } from '../types';

export const useWebSearch = ({ query, context }: { query?: string; context?: string }) => {
  const AiService = new EdgeAiServiceClient({
    endpoint: AI_SERVICE_ENDPOINT.REMOTE,
  });

  const [results, setResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const runSearch = async () => {
    try {
      setIsLoading(true);
      log.info('Running web search', { query, context });
      const results = await search({
        query,
        context,
        schema: [Testing.Project, Testing.Organization, Testing.Contact],
        AiService,
        exaApiKey: EXA_API_KEY,
      });

      const mappedResults = results.data.map((result): SearchResult => {
        const schema = Obj.getSchema(result);
        return {
          id: result.id,
          objectType: Obj.getTypename(result) as DXN.String | undefined,
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
  };

  return { runSearch, results, isLoading };
};
