//
// Copyright 2024 DXOS.org
//

import { generateText, ollama, runTools, type Tool } from 'modelfusion';

import { log } from '@dxos/log';
import { describe, test } from '@dxos/test';

import { mistralMultiToolCallOptions, mistralMultiToolCallPromptTemplate } from './mistral';
import { type Contact, Directory, directory, scheduler } from './tools';
import { functionOptions } from './util';
import { multiline } from '../../../util';

// Restart ollama if times out (server can hang): `ollama serve`.
// TODO(burdon): Long running tasks: https://modelfusion.dev/guide/experimental/server
// TODO(burdon): Local voice transcription https://github.com/ggerganov/whisper.cpp

// TODO(burdon): RAG tool.
// TODO(burdon): Discord fetcher tool.
// TODO(burdon): Chess analysis tool.

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

// https://github.com/vercel/modelfusion/tree/main/examples/middle-school-math-agent
describe.only('agent', () => {
  test('simple loop', async () => {
    const abortController = new AbortController();

    const dir = new Directory();
    await dir.upsert(contacts);

    const tools: Tool<any, any, any>[] = [directory(dir), scheduler()];

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

      // TODO(burdon): Strip numbers.
      const steps = response.split('\n').filter(Boolean);
      return {
        steps,
      };
    };

    const execPlan = async (steps: string[]) => {
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
    };

    // TODO(burdon): Retry if params don't match.
    const objective = 'schedule a meeting with the sales team for monday';
    const { steps } = await createPlan(objective);
    await execPlan(steps);
  }).timeout(30_000);
});
