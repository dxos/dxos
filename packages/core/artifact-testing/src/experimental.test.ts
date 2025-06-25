//
// Copyright 2025 DXOS.org
//

import { EchoTestBuilder } from '@dxos/echo-db/testing';
import { beforeAll, describe, test } from 'vitest';

import { EdgeAiServiceClient, OllamaAiServiceClient } from '@dxos/ai';
import { AI_SERVICE_ENDPOINT, EXA_API_KEY } from '@dxos/ai/testing';
import { researchFn } from '@dxos/assistant';
import { Obj } from '@dxos/echo';
import { type EchoDatabase } from '@dxos/echo-db';
import { ConfiguredCredentialsService, FunctionExecutor, ServiceContainer, TracingService } from '@dxos/functions';
import { DataType, DataTypes } from '@dxos/schema';
import { inspect } from 'util';

const REMOTE_AI = true;
const MOCK_SEARCH = false;

describe('experimental', () => {
  let builder: EchoTestBuilder;
  let db: EchoDatabase;
  let serviceContainer: ServiceContainer;

  beforeAll(async () => {
    // TODO(dmaretskyi): Helper to scaffold this from a config.
    builder = await new EchoTestBuilder().open();

    db = (await builder.createDatabase({ indexing: { vector: true } })).db;
    db.graph.schemaRegistry.addSchema(DataTypes);

    serviceContainer = new ServiceContainer().setServices({
      ai: {
        client: REMOTE_AI
          ? new EdgeAiServiceClient({
              endpoint: AI_SERVICE_ENDPOINT.REMOTE,
              defaultGenerationOptions: {
                // model: '@anthropic/claude-sonnet-4-20250514',
                model: '@anthropic/claude-3-5-sonnet-20241022',
              },
            })
          : new OllamaAiServiceClient({
              overrides: {
                model: 'llama3.1:8b',
              },
            }),
      },
      credentials: new ConfiguredCredentialsService([{ service: 'exa.ai', apiKey: EXA_API_KEY }]),
      database: { db },
      tracing: TracingService.console,
    });
  });

  test('bueprint');

  test('circuit');

  test('conversation');

  test('function', async () => {
    db.add(
      Obj.make(DataType.Organization, {
        name: 'Notion',
        website: 'https://www.notion.com',
      }),
    );
    await db.flush({ indexes: true });

    const executor = new FunctionExecutor(serviceContainer);
    const result = await executor.invoke(researchFn, {
      query: 'Who are the founders of Notion?',
      mockSearch: MOCK_SEARCH,
    });

    console.log(inspect(result, { depth: null, colors: true }));
    console.log(JSON.stringify(result, null, 2));
  });
});
