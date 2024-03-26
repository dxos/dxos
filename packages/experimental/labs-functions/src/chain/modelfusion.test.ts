//
// Copyright 2024 DXOS.org
//

import { expect } from 'chai';
import {
  ollama,
  zodSchema,
  jsonObjectPrompt,
  generateObject,
  createInstructionPrompt,
  Tool,
  runTools,
  type ToolCallsPromptTemplate,
  type InstructionPrompt,
  type ToolDefinition,
  parseJSON,
} from 'modelfusion';

import { PublicKey } from '@dxos/keys';
import { z } from '@dxos/plate';
import { describe, test } from '@dxos/test';

import { text } from './pipeline';

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

const getSchema = new Tool({
  name: 'schema',
  description: 'Get the list of schema objects.',
  parameters: zodSchema(z.string()),
  execute: async () => {
    return [
      {
        type: 'dxos.org/type/schema',
        name: 'Organization',
        schema: 'dxos.org/type/organization',
      },
      {
        type: 'dxos.org/type/schema',
        name: 'Contact',
        schema: 'dxos.org/type/contact',
      },
    ];
  },
});

const matchObject = new Tool({
  name: 'query',
  description: 'Query object database.',
  parameters: zodSchema(
    z.object({
      schema: z.string(),
    }),
  ),
  execute: async ({ schema }) => {
    console.log('##', schema);
    const objects = [
      {
        schema: 'dxos.org/type/organization',
        name: 'DXOS',
      },
      {
        schema: 'dxos.org/type/organization',
        name: 'Microsoft',
      },
      {
        schema: 'dxos.org/type/contact',
        name: 'Chad',
      },
    ];

    return objects.filter((object) => object.schema === schema);
  },
});

describe.only('ModelFusion', () => {
  // TODO(burdon): Multi-step.
  test.only('query', async () => {
    const result = await runTools({
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
      tools: [calculator, getSchema, matchObject],
      prompt: text(
        'answer the question below in multiple steps:',
        'first get all schema objects;',
        'next, find the schema that most closely matches the given type;',
        'next, query and return all objects of the associated schema',
        '',
        'Question:',
        'list all contacts',
      ),
    });
    console.log(result);
    // expect(toolResults).to.have.length(1);
  });

  test('calculator', async () => {
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
        'You are an machine that can find out information about people and organizations where they work.',
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
    console.log(JSON.stringify(result, undefined, 2));
    expect(result).to.exist;
  });
});
