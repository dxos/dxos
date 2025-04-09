//
// Copyright 2025 DXOS.org
//

import { useState } from 'react';

import { AIServiceEdgeClient } from '@dxos/assistant';
import { AI_SERVICE_ENDPOINT } from '@dxos/assistant/testing';
import { getSchema, getTypename } from '@dxos/echo-schema';
import type { DXN } from '@dxos/keys';
import { log } from '@dxos/log';
import { getIconAnnotation } from '@dxos/schema';
import { Testing } from '@dxos/schema/testing';

import { getStringProperty } from './sync';
import { search } from '../search';
import type { SearchResult } from '../types';

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
        aiService,
        exaApiKey: EXA_API_KEY,
      });

      const mappedResults = results.data.map((result): SearchResult => {
        const schema = getSchema(result);
        return {
          id: result.id,
          objectType: getTypename(result) as DXN.String | undefined,
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
