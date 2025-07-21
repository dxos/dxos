//
// Copyright 2025 DXOS.org
//

import { inspect } from 'node:util';
import { afterAll, beforeAll, describe, test } from 'vitest';

import {
  AiService,
  AiServiceRouter,
  structuredOutputParser
} from '@dxos/ai';
import { EXA_API_KEY, tapHttpErrors } from '@dxos/ai/testing';
import { Obj } from '@dxos/echo';
import { type EchoDatabase } from '@dxos/echo-db';
import { EchoTestBuilder } from '@dxos/echo-db/testing';
import { getSchemaDXN } from '@dxos/echo-schema';
import { ConfiguredCredentialsService, FunctionExecutor, ServiceContainer, TracingService } from '@dxos/functions';
import { DataType, DataTypes } from '@dxos/schema';

import { AnthropicClient } from '@effect/ai-anthropic';
import { NodeHttpClient } from '@effect/platform-node';
import { Config, Layer, ManagedRuntime } from 'effect';
import { createExtractionSchema, getSanitizedSchemaName } from './graph';
import { researchFn } from './research';

const REMOTE_AI = true;
const MOCK_SEARCH = false;

const AnthropicLayer = AnthropicClient.layerConfig({
  apiKey: Config.redacted('ANTHROPIC_API_KEY'),
  transformClient: tapHttpErrors,
}).pipe(Layer.provide(NodeHttpClient.layerUndici));

const AiServiceLayer = Layer.provide(
  //
  AiServiceRouter.AiServiceRouter,
  AnthropicLayer,
);

describe('Research', () => {
  let builder: EchoTestBuilder;
  let db: EchoDatabase;
  let executor: FunctionExecutor;
  let rt: ManagedRuntime.ManagedRuntime<AiService, any>;

  beforeAll(async () => {
    rt = ManagedRuntime.make(AiServiceLayer);

    // TODO(dmaretskyi): Helper to scaffold this from a config.
    builder = await new EchoTestBuilder().open();

    db = (await builder.createDatabase({ indexing: { vector: true } })).db;
    db.graph.schemaRegistry.addSchema(DataTypes);

    executor = new FunctionExecutor(
      new ServiceContainer().setServices({
        ai: await rt.runPromise(AiService),
        credentials: new ConfiguredCredentialsService([{ service: 'exa.ai', apiKey: EXA_API_KEY }]),
        database: { db },
        tracing: TracingService.console,
      }),
    );
  });

  afterAll(async () => {
    await rt.dispose();
  });

  test.only('should generate a research report', { timeout: 300_000 }, async () => {
    db.add(
      Obj.make(DataType.Organization, {
        name: 'Notion',
        website: 'https://www.notion.com',
      }),
    );
    await db.flush({ indexes: true });

    const result = await executor.invoke(researchFn, {
      query: 'Who are the founders of Notion?',
      mockSearch: MOCK_SEARCH,
    });

    console.log(inspect(result, { depth: null, colors: true }));
    console.log(JSON.stringify(result, null, 2));
  });
});

describe('misc', () => {
  test('createExtractionSchema', () => {
    const _schema = createExtractionSchema(DataTypes);
    // log.info('schema', { schema });
  });

  test('extract schema json schema', () => {
    const schema = createExtractionSchema(DataTypes);
    const _parser = structuredOutputParser(schema);
    // log.info('schema', { json: parser.tool.parameters });
  });

  test('getSanitizedSchemaName', () => {
    const _names = DataTypes.map(getSanitizedSchemaName);
    // log.info('names', { names });
  });

  test('getTypeAnnotation', () => {
    for (const schema of DataTypes) {
      const _dxn = getSchemaDXN(schema);
      // log.info('dxn', { schema, dxn });
    }
  });

  test.skip('sanitizeObjects', () => {
    const _TEST_DATA = {
      objects_dxos_org_type_Project: [
        {
          name: 'Reor',
          description:
            'A private & local AI personal knowledge management app focused on high entropy thinkers. Features include Q&A chat with full context of notes, automatic connection of ideas, semantic search, and local-first architecture with LLMs and vector databases.',
          image: 'https://reorhomepage-2-cwy0zagzg-reor-team.vercel.app/opengraph-image.jpg',
          id: 'reor-project-01',
        },
        {
          name: 'Personal AI',
          description:
            'A platform for creating personal AI models with unlimited memory capabilities. Features include memory stacking, data uploads, and personalized language models that can be trained on individual knowledge bases.',
          image: 'https://cdn.prod.website-files.com/5ff65c460ce39f5ec5681c6a/663d12aab1b425e1ad40d3a6_Memory-min.jpg',
          id: 'personal-ai-project-01',
        },
        {
          name: 'IKI AI',
          description:
            'An AI-native workspace for research, strategy, and creative work. Offers features like AI summarization, content analysis, and team knowledge sharing capabilities.',
          image: 'https://framerusercontent.com/assets/cI6Uo7x4q0W3uxzOt2preXjv6aE.jpg',
          id: 'iki-ai-project-01',
        },
        {
          name: 'Forethink',
          description:
            'A privacy-first, on-device AI system that proactively links current activities to relevant knowledge. Features real-time learning across teams and local data processing.',
          image: 'https://framerusercontent.com/assets/XDhN6tICnlElB134JWcWXOuXc.jpeg',
          id: 'forethink-project-01',
        },
        {
          name: 'Amurex',
          description:
            'An invisible AI companion that handles tasks, remembers important information, and supports workflow. Includes features for meeting automation, email categorization, and cross-platform search.',
          image: 'https://amurex.ai/ogimages/og_amurex.jpg',
          id: 'amurex-project-01',
        },
      ],
      objects_dxos_org_type_Organization: [
        {
          name: 'Reor',
          description:
            'A technology company focused on developing local-first AI solutions for personal knowledge management.',
          status: 'active',
          website: 'https://www.reorproject.org',
          id: 'reor-org-01',
        },
        {
          name: 'Personal.ai',
          description: 'A company specializing in personal AI development and memory management solutions.',
          status: 'active',
          website: 'https://www.personal.ai',
          id: 'personal-ai-org-01',
        },
        {
          name: 'IKI AI',
          description: 'A startup backed by 500 Global, developing AI-native workspaces for knowledge workers.',
          status: 'active',
          website: 'https://iki.ai',
          id: 'iki-ai-org-01',
        },
        {
          name: 'Forethink.ai',
          description:
            'A company focused on privacy-first AI solutions for knowledge management and team collaboration.',
          status: 'active',
          website: 'https://www.forethink.ai',
          id: 'forethink-org-01',
        },
      ],
      objects_dxos_org_type_Text: [
        {
          content:
            'Current trends in AI-powered Personal Knowledge Management (PKM) systems include: 1) Shift from document-based to graph-based systems for better knowledge connection, 2) Integration of large language models for enhanced content understanding and retrieval, 3) Focus on privacy-first and local-first architectures, 4) Emphasis on automatic knowledge connection and discovery, 5) Implementation of semantic search capabilities.',
          id: 'pkm-trends-text-01',
        },
        {
          content:
            'Key features emerging across modern PKM tools include: automated content categorization, semantic analysis and linking, personalized AI models that learn from user interaction, integration with existing workflows, and robust privacy protection. These tools are increasingly focusing on proactive knowledge surfacing rather than passive storage.',
          id: 'pkm-features-text-01',
        },
      ],
    };

    // const data = await sanitizeObjects(TYPES, TEST_DATA, db);
    // log.info('data', { data });
  });
});
