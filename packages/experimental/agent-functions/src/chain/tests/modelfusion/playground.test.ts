//
// Copyright 2024 DXOS.org
//

import { expect } from 'chai';
import {
  createInstructionPrompt,
  executeTool,
  generateObject,
  generateText,
  jsonObjectPrompt,
  MemoryVectorIndex,
  ollama,
  retrieve,
  runTools,
  streamText,
  Tool,
  upsertIntoVectorIndex,
  VectorIndexRetriever,
  zodSchema,
} from 'modelfusion';

import { z } from '@dxos/plate';
import { describe, test } from '@dxos/test';

import { mistralMultiToolCallOptions, mistralMultiToolCallPromptTemplate } from './mistral';
import { createChatTextGenerator, functionOptions } from './util';
import { multiline } from '../../../util';

// TODO(burdon): @modelfusion/sqlite-vss (replace FAISS).
// TODO(burdon): Local image generation.
// TODO(burdon): Streaming.
// TODO(burdon): MemoryCache.
// TODO(burdon): Llama.cpp GBNF grammar.

const defaultModel = 'ollama';

const calculator = new Tool({
  name: 'calculator',
  description: 'Perform basic arithmetic operations.',
  parameters: zodSchema(
    z.object({
      a: z.number(),
      b: z.number(),
      operator: z.enum(['+', '-', '*', '/']).describe('The operator (+, -, *, /).'),
    }),
  ),
  execute: async ({ a, b, operator }) => {
    switch (operator) {
      case '+':
        return a * b;
      case '-':
        return a - b;
      case '*':
        return a * b;
      case '/':
        return a / b;
      default:
        throw new Error(`Invalid operator: ${operator}`);
    }
  },
});

describe.skip('ModelFusion', () => {
  //
  test('tools', async () => {
    const { toolResults } = await runTools({
      ...functionOptions(),
      model: ollama
        .CompletionTextGenerator({
          ...mistralMultiToolCallOptions,
          temperature: 0,
        })
        .withInstructionPrompt()
        .asToolCallsOrTextGenerationModel(mistralMultiToolCallPromptTemplate),
      tools: [calculator],
      prompt: 'what is 6 times 7',
    });
    expect(toolResults).to.have.length(1);
    expect(toolResults![0].result).to.eq(42);
  });

  // https://modelfusion.dev/guide/tools/advanced/execute-tool
  test('exec tool', async () => {
    const result = await executeTool({
      ...functionOptions(),
      tool: calculator,
      args: {
        a: 6,
        b: 7,
        operator: '*',
      },
    });

    expect(result).to.eq(42);
  });

  //
  test('objects', async () => {
    const model = ollama
      .ChatTextGenerator({
        model: 'llama3',
        maxGenerationTokens: 1024,
        temperature: 0,
      })
      .asObjectGenerationModel(jsonObjectPrompt.instruction());

    // TODO(burdon): Generate multi-step spider (focus on one step at a time). Generate RDF.
    // TODO(burdon): Convert effect to json schema to zod? Or just validator.
    const schema = zodSchema(
      z.object({
        people: z.array(
          z
            .object({
              //
              id: z.number(),
              name: z.string(),
            })
            .describe('Person.'),
        ),
        organizations: z.array(
          z
            .object({
              //
              id: z.number(),
              name: z.string(),
              website: z.string(),
              description: z.string(),
            })
            .describe('Organization or company.'),
        ),
      }),
    );

    // TODO(burdon): Multiple agent steps to create a graph.
    const prompt = createInstructionPrompt(async ({ company }: { company: string }) => ({
      system: multiline(
        'You are a machine that can find out information about people and organizations where they work.',
        'Always response by construct a directed graph representing people and organizations as separate objects.',
        'For each person and organization object that you generate assign a unique "id" property.',
        'Use this "id" to reference people and organizations.',
      ),
      instruction: `What is the leadership structure of ${company}`,
    }));

    const result = await generateObject({
      ...functionOptions(),
      model,
      schema,
      prompt: prompt({ company: 'Microsoft' }),
    });

    expect(result).to.exist;
  });

  test('instruction', async () => {
    const model = createChatTextGenerator(defaultModel).withInstructionPrompt();
    const response = await generateText({
      model,
      prompt: {
        system: 'You are a machine that can answer questions about the world.',
        instruction: 'Write a single sentence summary of the first second after the big bang.',
      },
    });
    expect(response).to.exist;
  });

  // TODO(burdon): trimChatPrompt to limit context window.
  test('stream', async () => {
    const model = createChatTextGenerator(defaultModel).withChatPrompt();
    const stream = await streamText({
      model,
      prompt: {
        system: 'you are a machine',
        messages: [
          {
            role: 'assistant',
            content:
              'You are a machine that can answer questions about the world. Just answer as succinctly as possible without explanations',
          },
          {
            role: 'user',
            content: 'what is the capital of france',
          },
        ],
      },
    });

    const parts = [];
    for await (const message of stream) {
      parts.push(message);
    }
    console.log(JSON.stringify(parts));
    expect(parts).to.have.length.greaterThan(5);
  });

  // https://modelfusion.dev/tutorial/retrieval-augmented-generation
  test('rag', async () => {
    const model = createChatTextGenerator(defaultModel);
    const embeddingModel = ollama.TextEmbedder({
      model: 'nomic-embed-text',
    });
    const vectorIndex = new MemoryVectorIndex<string>();
    const retriever = new VectorIndexRetriever({
      vectorIndex,
      embeddingModel,
      maxResults: 3,
      similarityThreshold: 0.8,
    });

    {
      const objects = [
        'Tokyo is the capital of Japan.',
        'Paris is the capital of France.',
        'London is the capital of the UK.',
        'The Eiffel Tower is in Paris.',
      ];

      await upsertIntoVectorIndex({
        vectorIndex,
        embeddingModel,
        objects,
        getValueToEmbed: (text) => text,
      });
    }

    let count = 0;
    const query = async (question: string) => {
      const chunks = await retrieve(retriever, question);

      return generateText({
        ...functionOptions(`rag-${count++}`),
        model,
        prompt: [
          {
            role: 'system',
            content: multiline(
              "Answer the user's question using only the provided information below.",
              'If the user\'s question cannot be answered using the provided information, respond with "I don\'t know".',
            ),
          },
          {
            role: 'user',
            content: multiline('## QUESTION', question),
          },
          {
            role: 'user',
            content: multiline('## INFORMATION', JSON.stringify(chunks)),
          },
        ],
      });
    };

    {
      const result = await query('What is the capital of France?');
      expect(result).to.contain('Paris');
    }

    {
      const result = await query('What is the capital of Japan?');
      expect(result).to.contain('Tokyo');
    }
  });
});
