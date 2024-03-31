//
// Copyright 2024 DXOS.org
//

import {
  generateText,
  MemoryVectorIndex,
  ollama,
  retrieve,
  runTools,
  Tool,
  upsertIntoVectorIndex,
  VectorIndexRetriever,
  zodSchema,
} from 'modelfusion';

import { log } from '@dxos/log';
import { z } from '@dxos/plate';
import { describe, test } from '@dxos/test';

import { mistralMultiToolCallOptions, mistralMultiToolCallPromptTemplate } from './mistral';
import { functionOptions } from './util';
import { multiline } from '../../../util';

// Restart ollama if times out (server can hang): `ollama serve`.
// TODO(burdon): Long running tasks: https://modelfusion.dev/guide/experimental/server
// TODO(burdon): Local voice transcription https://github.com/ggerganov/whisper.cpp

// https://github.com/vercel/modelfusion/tree/main/examples/middle-school-math-agent
describe.only('agent', () => {
  test('simple loop', async () => {
    const abortController = new AbortController();

    const dir = new Directory();
    await dir.upsert(contacts);

    const tools: Tool<any, any, any>[] = [directory(dir), scheduler];

    const objective = 'schedule a meeting with the eng team';

    // Planner.
    // TODO(burdon): Factor out as separate planner tool.
    const createPlan = async (objective: string) => {
      const model = ollama.ChatTextGenerator({ model: 'mistral', temperature: 0 }).withInstructionPrompt();
      const response = await generateText({
        ...functionOptions('sanity'),
        model,
        prompt: {
          system: multiline(
            'you are a helpful assistant.',
            'reason step by step to create a concise plan for the given objective below.',
            'create a plan with the fewest number of steps.',
            'only respond with the steps required to achieve the objective and no other explanation.',
            'only consider steps that can be achieved by the available tools.',
            'if you do not have enough information to satisfy the required parameters of the tool use a different tool to get this information or ask me for more information',
            'do not include the required tool parameters in your plan.',
            '',
            'you have access to the following tools:',
            ...tools.flatMap((tool) => [
              '',
              `${tool.name}:`,
              `- description: ${tool.description ?? ''}`,
              `- parameters: ${JSON.stringify(tool.parameters.getJsonSchema())}`,
            ]),
          ),
          instruction: objective,
        },
      });

      return response.split('\n').filter(Boolean);
    };

    const steps = await createPlan(objective);
    log.info('steps', { steps });

    const model = ollama
      .CompletionTextGenerator(mistralMultiToolCallOptions)
      .withInstructionPrompt()
      .asToolCallsOrTextGenerationModel(mistralMultiToolCallPromptTemplate);

    const context: string[] = ['## Context'];

    for (const step of steps) {
      const match = step.match(/[\d\W.]*(.+)/);
      if (match) {
        const [_, objective] = match;
        const prompt = [objective, ...context].join('\n');
        log.info('step', { prompt });

        const { text, toolResults } = await runTools({
          // ...functionOptions('agent'),
          model,
          tools,
          prompt,
          run: { abortSignal: abortController.signal },
        });

        log.info('result', { text, toolResults });
        if (toolResults?.length) {
          context.push(`Objective: ${objective}`);
          context.push(`Result: ${JSON.stringify(toolResults[0].result)}`);
        }
      }
    }
  }).timeout(30_000);
});

// TODO(burdon): RAG tool.
// TODO(burdon): Discord fetcher tool.
// TODO(burdon): Chess analysis tool.

type Contact = { name: string; role?: string };

class Directory {
  contacts = new Map<string, Contact>();
  vectorIndex = new MemoryVectorIndex<string>();
  embeddingModel = ollama.TextEmbedder({ model: 'nomic-embed-text' });
  retriever = new VectorIndexRetriever({
    vectorIndex: this.vectorIndex,
    embeddingModel: this.embeddingModel,
    maxResults: 1,
    similarityThreshold: 0.5,
  });

  async upsert(contacts: Contact[]) {
    contacts.forEach((contact) => this.contacts.set(contact.name, contact));
    await upsertIntoVectorIndex({
      vectorIndex: this.vectorIndex,
      embeddingModel: this.embeddingModel,
      objects: contacts.map((contact) => contact.role),
      getValueToEmbed: (text) => text,
    });
  }

  async getByRole(role: string) {
    const roles = await retrieve(this.retriever, role);
    if (!roles.length) {
      return [];
    }

    return Array.from(this.contacts.values()).filter((contact) => contact.role === roles[0]);
  }
}

const contacts: Contact[] = [
  {
    name: 'alice',
    role: 'engineer',
  },
  {
    name: 'bob',
    role: 'engineer',
  },
  {
    name: 'charlie',
    role: 'sales',
  },
  {
    name: 'davie',
    role: 'sales',
  },
];

const directory = (directory: Directory) =>
  new Tool({
    name: 'directory',
    description: 'Find people.',
    parameters: zodSchema(
      z.object({
        name: z.string().optional().nullable().describe('Name of person.'),
        role: z.string().optional().nullable().describe('Role of person.'),
      }),
    ),
    returnType: zodSchema(
      z.object({
        people: z.array(z.string()).describe('List of usernames.'),
      }),
    ),
    execute: async ({ name, role, ...rest }) => {
      log.info('directory', { name, role, rest });
      let contacts: Contact[] = [];
      if (role) {
        contacts = await directory.getByRole(role);
      }

      return {
        people: contacts.map((contact) => contact.name),
      };
    },
  });

const scheduler = new Tool({
  name: 'scheduler',
  description: 'Schedule meetings with people.',
  parameters: zodSchema(
    z.object({
      subject: z.string().describe('Subject of meeting.'),
      attendees: z.array(z.string()).min(1).describe('Valid usernames of attendees.'),
    }),
  ),
  returnType: zodSchema(
    z.object({
      invitation: z.string().describe('Meeting url.'),
    }),
  ),
  execute: async ({ subject, attendees }) => {
    log.info('scheduler', { subject, attendees });
    return {
      invitation: 'https://meet.com/123',
    };
  },
});
