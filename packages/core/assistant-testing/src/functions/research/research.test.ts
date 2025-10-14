//
// Copyright 2025 DXOS.org
//

import { inspect } from 'node:util';

import * as Test from '@effect/vitest';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';

import { AiService, ConsolePrinter, MemoizedAiService } from '@dxos/ai';
import { AiServiceTestingPreset, EXA_API_KEY } from '@dxos/ai/testing';
import {
  AiConversation,
  type ContextBinding,
  GenerationObserver,
  makeToolExecutionServiceFromFunctions,
  makeToolResolverFromFunctions,
} from '@dxos/assistant';
import { Blueprint } from '@dxos/blueprints';
import { Obj, Ref, Type } from '@dxos/echo';
import { TestHelpers } from '@dxos/effect';
import {
  ComputeEventLogger,
  CredentialsService,
  DatabaseService,
  FunctionInvocationService,
  QueueService,
  TracingService,
} from '@dxos/functions';
import { TestDatabaseLayer } from '@dxos/functions/testing';
import { ObjectId } from '@dxos/keys';
import { DataType } from '@dxos/schema';

import { RESEARCH_BLUEPRINT } from '../../blueprints';
import { testToolkit } from '../../blueprints/testing';

import createResearchNote from './create-research-note';
import { createExtractionSchema, getSanitizedSchemaName } from './graph';
import { default as research } from './research';
import { ResearchGraph, queryResearchGraph } from './research-graph';
import { ResearchDataTypes } from './types';

ObjectId.dangerouslyDisableRandomness();

const TestLayer = Layer.mergeAll(
  AiService.model('@anthropic/claude-opus-4-0'),
  makeToolResolverFromFunctions([research, createResearchNote], testToolkit),
  makeToolExecutionServiceFromFunctions(testToolkit, testToolkit.toLayer({}) as any),
  ComputeEventLogger.layerFromTracing,
).pipe(
  Layer.provideMerge(FunctionInvocationService.layerTest({ functions: [research, createResearchNote] })),
  Layer.provideMerge(
    Layer.mergeAll(
      MemoizedAiService.layerTest().pipe(Layer.provide(AiServiceTestingPreset('direct'))),
      TestDatabaseLayer({
        indexing: { vector: true },
        types: [...ResearchDataTypes, ResearchGraph, Blueprint.Blueprint],
      }),
      CredentialsService.configuredLayer([{ service: 'exa.ai', apiKey: EXA_API_KEY }]),
      TracingService.layerNoop,
    ),
  ),
);

Test.describe('Research', () => {
  Test.it.effect(
    'call a function to generate a research report',
    Effect.fnUntraced(
      function* (_) {
        yield* DatabaseService.add(
          Obj.make(DataType.Organization, {
            name: 'Airbnb',
            website: 'https://www.airbnb.com/',
          }),
        );
        yield* DatabaseService.flush({ indexes: true });

        const result = yield* FunctionInvocationService.invokeFunction(research, {
          query: 'Founders and investors of airbnb.',
          mockSearch: false,
        });

        console.log(inspect(result, { depth: null, colors: true }));
        console.log(JSON.stringify(result, null, 2));

        yield* DatabaseService.flush({ indexes: true });
        const researchGraph = yield* queryResearchGraph();
        const data = yield* DatabaseService.load(researchGraph!.queue).pipe(
          Effect.flatMap((queue) => Effect.promise(() => queue.queryObjects())),
        );
        console.log(inspect(data, { depth: null, colors: true }));
      },
      Effect.provide(TestLayer),
      TestHelpers.provideTestContext,
    ),
    MemoizedAiService.isGenerationEnabled() ? 240_000 : undefined,
  );

  // TODO(dmaretskyi): Out-of-memory.
  Test.it.effect.skip(
    'research blueprint',
    Effect.fnUntraced(
      function* (_) {
        const conversation = new AiConversation({
          queue: yield* QueueService.createQueue<DataType.Message | ContextBinding>(),
        });

        const org = Obj.make(DataType.Organization, { name: 'Airbnb', website: 'https://www.airbnb.com/' });
        yield* DatabaseService.add(org);
        yield* DatabaseService.flush({ indexes: true });

        const blueprint = yield* DatabaseService.add(Obj.clone(RESEARCH_BLUEPRINT));
        yield* Effect.promise(() => conversation.context.bind({ blueprints: [Ref.make(blueprint)] }));

        const observer = GenerationObserver.fromPrinter(new ConsolePrinter());
        yield* conversation.createRequest({
          observer,
          prompt: `Research airbnb founders.`,
        });

        const researchGraph = yield* queryResearchGraph();
        const data = yield* DatabaseService.load(researchGraph!.queue).pipe(
          Effect.flatMap((queue) => Effect.promise(() => queue.queryObjects())),
        );
        console.log(inspect(data, { depth: null, colors: true }));
      },
      Effect.provide(TestLayer),
      TestHelpers.provideTestContext,
    ),
    MemoizedAiService.isGenerationEnabled() ? 240_000 : undefined,
  );
});

Test.describe('misc', () => {
  Test.it('createExtractionSchema', () => {
    const _schema = createExtractionSchema(ResearchDataTypes);
    // log.info('schema', { schema });
  });

  Test.it('getSanitizedSchemaName', () => {
    const _names = ResearchDataTypes.map(getSanitizedSchemaName);
    // log.info('names', { names }) ;
  });

  Test.it('getTypeAnnotation', () => {
    for (const schema of ResearchDataTypes) {
      const _dxn = Type.getDXN(schema);
      // log.info('dxn', { schema, dxn });
    }
  });

  Test.it.skip('sanitizeObjects', () => {
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
