//
// Copyright 2024 DXOS.org
//

import { generateText, ollama, runTools, type Tool, ToolCallArgumentsValidationError } from 'modelfusion';

import { log } from '@dxos/log';

import { multiline } from '../../../../util';
import { mistralMultiToolCallOptions, mistralMultiToolCallPromptTemplate } from '../mistral';
import { functionOptions } from '../util';

// TODO(burdon): Wrap with effects.

export type Plan = {
  steps: string[];
};

export type CreatePlanParams = {
  tools: Tool<any, any, any>[];
  objective: string;
};

export const createPlan = async ({ tools, objective }: CreatePlanParams): Promise<Plan> => {
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

  const steps = response
    .split('\n')
    .map((step) => {
      // Trip numbers.
      const match = step.match(/[\d\W.]*(.+)/);
      return match ? match[1] : step;
    })
    .filter(Boolean);

  return {
    steps,
  };
};

export type ExecPlanParams = {
  tools: Tool<any, any, any>[];
  plan: Plan;
};

export const execPlan = async ({ tools, plan }: ExecPlanParams) => {
  const abortController = new AbortController();
  log.info('steps', plan);

  const model = ollama
    .CompletionTextGenerator({ ...mistralMultiToolCallOptions, temperature: 0.1 })
    .withInstructionPrompt()
    .asToolCallsOrTextGenerationModel(mistralMultiToolCallPromptTemplate);

  const context: string[] = [];

  const { steps } = plan;
  for (const step of steps) {
    context.push(`Objective: ${step}`);
    const prompt = context.join('\n');

    const maxAttempts = 3;
    for (let attempt = 1; attempt < maxAttempts; attempt++) {
      try {
        log.info('step', { prompt, attempt });
        const { text, toolResults } = await runTools({
          // ...functionOptions('agent'),
          run: { abortSignal: abortController.signal },
          model,
          tools,
          prompt,
        });

        log.info('result', { text, toolResults });
        if (toolResults?.length) {
          context.push(`Result: ${JSON.stringify(toolResults[0].result)}`);
        }

        break;
      } catch (err) {
        if (err instanceof ToolCallArgumentsValidationError) {
          if (attempt === maxAttempts) {
            throw new Error(`max attempts: ${maxAttempts}`);
          }

          log.info('retry', { attempt });
        } else {
          throw err;
        }
      }
    }
  }
};
