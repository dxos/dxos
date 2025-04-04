import { useEffect, useState } from 'react';
import type { SearchResult } from '../types';
import { search } from '../search';
import { Testing } from '@dxos/schema/testing';
import { useCapability } from '@dxos/app-framework';
import { AIServiceEdgeClient } from '@dxos/assistant';
import { AI_SERVICE_ENDPOINT } from '@dxos/assistant/testing';
import { log } from '@dxos/log';
import { getStringProperty } from './sync';

// TODO(dmaretskyi): Get from config/credentials
const EXA_API_KEY = '9c7e17ff-0c85-4cd5-827a-8b489f139e03';

export const useWebSearch = ({ query, context }: { query?: string; context?: string }) => {
  const aiService = new AIServiceEdgeClient({
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
        schema: [Testing.ProjectType, Testing.OrgType, Testing.ContactType],
        aiService: aiService,
        exaApiKey: EXA_API_KEY,
      });

      const mappedResults = results.data.map((result): SearchResult => {
        return {
          id: result.id,
          label: getStringProperty(result, ['name', 'title', 'label']),
          snippet: getStringProperty(result, ['description', 'content', 'website', 'email']),
          object: result,
        };
      });

      setResults(mappedResults);
    } finally {
      setIsLoading(false);
    }
  };
  return { runSearch, results, isLoading };
};
