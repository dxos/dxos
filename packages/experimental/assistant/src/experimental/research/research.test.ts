//
// Copyright 2025 DXOS.org
//

import { identity, Option, Schema, SchemaAST } from 'effect';
import { describe, test } from 'vitest';

import { structuredOutputParser } from '@dxos/artifact';
import { isEncodedReference } from '@dxos/echo-protocol';
import {
  create,
  getEntityKind,
  getSchemaDXN,
  ObjectId,
  ReferenceAnnotationId,
  RelationSourceId,
  RelationTargetId,
} from '@dxos/echo-schema';
import { mapAst } from '@dxos/effect';
import { log } from '@dxos/log';
import { DataType } from '@dxos/schema';
import { deepMapValues } from '@dxos/util';

import { createExaTool, createMockExaTool } from './exa';
import INSTRUCTIONS from './instructions.tpl?raw';
import { AIServiceEdgeClient, OllamaClient } from '../../ai-service';
import { AISession } from '../../session';
import { AI_SERVICE_ENDPOINT, ConsolePrinter } from '../../testing';
import { Relation } from '@dxos/echo';
import { inspect } from 'node:util';

const EXA_API_KEY = '9c7e17ff-0c85-4cd5-827a-8b489f139e03';
const REMOTE_AI = true;

const aiService = REMOTE_AI
  ? new AIServiceEdgeClient({
      endpoint: AI_SERVICE_ENDPOINT.REMOTE,
    })
  : new OllamaClient({
      overrides: {
        model: 'llama3.1:8b',
      },
    });

const Develops = Schema.Struct({
  since: Schema.optional(Schema.String),
})
  .pipe(
    Relation.def({
      typename: 'example.com/relation/Develops',
      version: '0.1.0',
      source: DataType.Organization,
      target: DataType.Project,
    }),
  )
  .annotations({
    description: 'A relation between an organization and a project.',
  });

const TYPES = [
  DataType.Event,
  DataType.Organization,
  DataType.Person,
  DataType.Project,
  DataType.Task,
  DataType.Text,
  Develops,
];

const MOCK_SEARCH = true;

// 1. Finding related entities in knowledge graph.
// 2. Linking them into transcript text
// 3. Doing external research.

describe('Research', () => {
  test('should generate a research report', { timeout: 1000000 }, async () => {
    const searchTool = MOCK_SEARCH ? createMockExaTool() : createExaTool({ apiKey: EXA_API_KEY });

    const session = new AISession({ operationModel: 'configured' });

    const printer = new ConsolePrinter();
    session.message.on((message) => printer.printMessage(message));
    session.userMessage.on((message) => printer.printMessage(message));
    session.block.on((block) => printer.printContentBlock(block));

    // TODO(dmaretskyi): Consider adding this pattern as the "Graph" output mode for the session.
    const outputSchema = createExtractionSchema(TYPES);
    const result = await session.runStructured(outputSchema, {
      client: aiService,
      systemPrompt: INSTRUCTIONS,
      artifacts: [],
      tools: [searchTool],
      generationOptions: {
        model: '@anthropic/claude-3-5-sonnet-20241022',
      },
      history: [],
      prompt:
        'Find projects that are in the space of AI and personal knowledge management. Project, org, relations between them.',
    });
    const data = sanitizeObjects(TYPES, result as any);

    console.log(inspect(data, { depth: null, colors: true }));
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

const createExtractionSchema = (types: Schema.Schema.AnyNoContext[]) => {
  return Schema.Struct({
    ...Object.fromEntries(
      types.map(preprocessSchema).map((schema, index) => [
        `objects_${getSanitizedSchemaName(types[index])}`,
        Schema.optional(Schema.Array(schema)).annotations({
          description: `The objects to answer the query of type: ${getSchemaDXN(types[index])?.asTypeDXN()!.type}`,
        }),
      ]),
    ),
  });
};

const getSanitizedSchemaName = (schema: Schema.Schema.AnyNoContext) => {
  return getSchemaDXN(schema)!
    .asTypeDXN()!
    .type.replaceAll(/[^a-zA-Z0-9]+/g, '_');
};

const sanitizeObjects = (types: Schema.Schema.AnyNoContext[], data: Record<string, readonly unknown[]>) => {
  const entries = types
    .map(
      (type) =>
        data[`objects_${getSanitizedSchemaName(type)}`]?.map((object: any) => ({
          data: object,
          schema: type,
        })) ?? [],
    )
    .flat();

  const idMap = new Map<string, string>();

  return entries
    .map((entry) => {
      idMap.set(entry.data.id, ObjectId.random());
      entry.data.id = idMap.get(entry.data.id);
      return entry;
    })
    .map((entry) => {
      const data = deepMapValues(entry.data, (value, recurse) => {
        if (isEncodedReference(value)) {
          const ref = value['/'];
          if (idMap.has(ref)) {
            // TODO(dmaretskyi): Whats the best way to represent a local url.
            return { '/': `dxn:echo:@:${idMap.get(ref)}` };
          } else {
            // Search URIs?
            return { '/': `search:?q=${encodeURIComponent(ref)}` };
          }
        }

        return recurse(value);
      });

      if (getEntityKind(entry.schema) === 'relation') {
        const sourceId = idMap.get(data.source)!;
        if (!sourceId) {
          log.warn('source not found', { source: data.source });
        }
        const targetId = idMap.get(data.target)!;
        if (!targetId) {
          log.warn('target not found', { target: data.target });
        }
        delete data.source;
        delete data.target;
        data[RelationSourceId] = sourceId;
        data[RelationTargetId] = targetId;
      }

      return create(entry.schema, data);
    });
};

const SoftRef = Schema.Struct({
  '/': Schema.String,
}).annotations({
  description: 'Reference to another object.',
});

const preprocessSchema = (schema: Schema.Schema.AnyNoContext) => {
  const isRelationSchema = getEntityKind(schema) === 'relation';

  const go = (ast: SchemaAST.AST): SchemaAST.AST => {
    if (SchemaAST.getAnnotation(ast, ReferenceAnnotationId).pipe(Option.isSome)) {
      return SoftRef.ast;
    }

    return mapAst(ast, go);
  };

  return Schema.make<any, any, never>(mapAst(schema.ast, go)).pipe(
    Schema.omit('id'),
    Schema.extend(
      Schema.Struct({
        id: Schema.String.annotations({
          description: 'The id of this object. Come up with a unique id based on your judgement.',
        }),
      }),
    ),
    isRelationSchema
      ? Schema.extend(
          Schema.Struct({
            source: Schema.String.annotations({
              description: 'The id of the source object for this relation.',
            }),
            target: Schema.String.annotations({
              description: 'The id of the target object for this relation.',
            }),
          }),
        )
      : identity<Schema.Schema.AnyNoContext>,
  );
};
