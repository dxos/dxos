//
// Copyright 2024 DXOS.org
//

import { expect } from 'chai';
import {
  createInstructionPrompt,
  generateObject,
  jsonObjectPrompt,
  ollama,
  parseJSON,
  retrieve,
  runTools,
  zodSchema,
  Tool,
  type ToolCallsPromptTemplate,
  type InstructionPrompt,
  type ToolDefinition,
  VectorIndexRetriever,
  MemoryVectorIndex,
  upsertIntoVectorIndex,
  generateText,
} from 'modelfusion';

import { PublicKey } from '@dxos/keys';
import { z } from '@dxos/plate';
import { describe, test } from '@dxos/test';

import { text } from '../pipeline';

// TODO(burdon): @modelfusion/sqlite-vss (replace FAISS).
// TODO(burdon): Local image generation.
// TODO(burdon): Embedding/RAG.
// TODO(burdon): Tools; useToolsOrGenerateText
// TODO(burdon): Streaming.
// TODO(burdon): MemoryCache.
// TODO(burdon): Llama.cpp GBNF grammar.

export const multiToolCallPromptTemplate: ToolCallsPromptTemplate<string, InstructionPrompt> = {
  createPrompt: (instruction: string, tools: Array<ToolDefinition<string, unknown>>) => {
    return {
      system: text(
        "Select the most suitable function and parameters from the list of available functions below, based on the user's input.",
        'Provide your response in JSON format.',
        '',
        'Available functions:',
        ...tools.flatMap((tool) => [
          '',
          tool.name,
          `description: ${tool.description ?? ''}`,
          `parameters: ${JSON.stringify(tool.parameters.getJsonSchema())}`,
        ]),
      ),
      instruction,
    };
  },

  extractToolCallsAndText: (response: string) => {
    const json = parseJSON({
      text: response,
      schema: zodSchema(z.object({ function: z.string(), parameters: z.any() })),
    });

    return {
      text: null,
      toolCalls: [
        {
          id: PublicKey.random().toHex(),
          name: json.function,
          args: json.parameters,
        },
      ],
    };
  },
};

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

describe.only('ModelFusion', () => {
  //
  test('tools', async () => {
    const { toolResults } = await runTools({
      model: ollama
        .CompletionTextGenerator({
          model: 'mistral',
          promptTemplate: ollama.prompt.Mistral,
          raw: true, // Required when using custom prompt template.
          stopSequences: ['\n\n'], // Prevent infinite generation.
          temperature: 0,
        })
        .withInstructionPrompt()
        .asToolCallsOrTextGenerationModel(multiToolCallPromptTemplate),
      tools: [calculator],
      // TODO(burdon): Multiple steps.
      prompt: 'what is 6 times 7',
    });
    expect(toolResults).to.have.length(1);
    expect(toolResults![0].result).to.eq(42);
  });

  //
  test('objects', async () => {
    const model = ollama
      .ChatTextGenerator({
        model: 'llama2',
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

    // TODO(burdon): Multiple steps to create a graph.
    const prompt = createInstructionPrompt(async ({ company }: { company: string }) => ({
      system: text(
        'You are a machine that can find out information about people and organizations where they work.',
        'Always response by construct a directed graph representing people and organizations as separate objects.',
        'For each person and organization object that you generate assign a unique "id" property.',
        'Use this "id" to reference people and organizations.',
      ),
      instruction: `What is the leadership structure of ${company}`,
    }));

    const result = await generateObject({
      model,
      schema,
      prompt: prompt({ company: 'Microsoft' }),
    });
    // console.log(JSON.stringify(result, undefined, 2));
    expect(result).to.exist;
  });

  // https://modelfusion.dev/tutorial/retrieval-augmented-generation
  test.only('rag', async () => {
    const vectorIndex = new MemoryVectorIndex<string>();
    const embeddingModel = ollama.TextEmbedder({
      model: 'nomic-embed-text',
    });

    const texts = [
      'Paris is the capital of France.',
      'The Eiffel Tower is in Paris.',
      'Tokyo is the capital of Japan.',
    ];

    await upsertIntoVectorIndex({
      vectorIndex,
      embeddingModel,
      objects: texts,
      getValueToEmbed: (text) => text,
    });

    const question = 'What is the capital of France?';
    const chunks = await retrieve(
      new VectorIndexRetriever({
        vectorIndex,
        embeddingModel,
        maxResults: 3,
        similarityThreshold: 0.8,
      }),
      question,
    );

    console.log(JSON.stringify(chunks, undefined, 2));

    const answer = await generateText({
      model: ollama.ChatTextGenerator({
        model: 'mistral',
        temperature: 0,
        maxGenerationTokens: 500,
      }),

      prompt: [
        {
          role: 'system',
          content: text(
            "Answer the user's question using only the provided information.",
            'If the user\'s question cannot be answered using the provided information, respond with "I don\'t know".',
          ),
        },
        {
          role: 'user',
          content: text('## QUESTION', question),
        },
        {
          role: 'user',
          content: text('## INFORMATION', JSON.stringify(chunks)),
        },
      ],
    });

    expect(answer).to.contain('Paris');
  });

  // https://modelfusion.dev/guide/tools/agent-loop
  test.only('agent', async () => {});
});
