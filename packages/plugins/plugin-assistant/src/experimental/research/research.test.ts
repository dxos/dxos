//
// Copyright 2025 DXOS.org
//

import { describe, test } from 'vitest';

import { structuredOutputParser } from '@dxos/artifact';
import { AIServiceEdgeClient, OllamaClient } from '@dxos/assistant';
import { AI_SERVICE_ENDPOINT } from '@dxos/assistant/testing';
import { getSchemaDXN } from '@dxos/echo-schema';
import { ConfiguredCredentialsService, FunctionExecutor, ServiceContainer } from '@dxos/functions';
import { log } from '@dxos/log';
import { inspect } from 'node:util';
import { createExtractionSchema, getSanitizedSchemaName, researchFn, sanitizeObjects, TYPES } from './research';

const REMOTE_AI = true;
const MOCK_SEARCH = true;
const EXA_API_KEY = '9c7e17ff-0c85-4cd5-827a-8b489f139e03';

describe('Research', () => {
  // TODO(dmaretskyi): Helper to scaffold this from a config.
  const executor = new FunctionExecutor(
    new ServiceContainer().setServices({
      ai: {
        client: REMOTE_AI
          ? new AIServiceEdgeClient({
              endpoint: AI_SERVICE_ENDPOINT.LOCAL,
            })
          : new OllamaClient({
              overrides: {
                model: 'llama3.1:8b',
              },
            }),
      },
      credentials: new ConfiguredCredentialsService([{ service: 'https://exa.ai/', apiKey: EXA_API_KEY }]),
    }),
  );

  test('should generate a research report', { timeout: 1000000 }, async () => {
    const result = await executor.invoke(researchFn, {
      query:
        'Find projects that are in the space of AI and personal knowledge management. Project, org, relations between them.',
      mockSearch: MOCK_SEARCH,
    });

    console.log(inspect(result, { depth: null, colors: true }));
  });
});

describe.skip('misc', () => {
  test('createExtractionSchema', () => {
    const schema = createExtractionSchema(TYPES);
    log.info('schema', { schema });
  });

  test('extract schema json schema', () => {
    const schema = createExtractionSchema(TYPES);
    const parser = structuredOutputParser(schema);
    log.info('schema', { json: parser.tool.parameters });
  });

  test('getSanitizedSchemaName', () => {
    const names = TYPES.map(getSanitizedSchemaName);
    log.info('names', { names });
  });

  test('getTypeAnnotation', () => {
    for (const schema of TYPES) {
      const dxn = getSchemaDXN(schema);
      log.info('dxn', { schema, dxn });
    }
  });

  test('sanitizeObjects', () => {
    const TEST_DATA = {
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

    const data = sanitizeObjects(TYPES, TEST_DATA);
    log.info('data', { data });
  });
});
