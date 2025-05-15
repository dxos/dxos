//
// Copyright 2025 DXOS.org
//

import { Schema } from 'effect';
import Exa from 'exa-js';

import { defineTool, ToolResult } from '@dxos/artifact';
import { log } from '@dxos/log';

type CreateExaToolOptions = {
  apiKey: string;
};

export const createExaTool = ({ apiKey }: CreateExaToolOptions) => {
  const exa = new Exa(apiKey);

  return defineTool('search', {
    name: 'web_search',
    description: 'Search the web for information',
    schema: Schema.Struct({
      query: Schema.String.annotations({ description: 'The query to search for' }),
    }),
    execute: async ({ query }) => {
      const context = await exa.searchAndContents(query, {
        type: 'auto',
        text: {
          maxCharacters: 3_000,
        },
        livecrawl: 'always',
      });

      log.info('exa search', { query, costDollars: context.costDollars });

      return ToolResult.Success(context);
    },
  });
};
