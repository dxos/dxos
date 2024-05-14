//
// Copyright 2024 DXOS.org
//

import {
  type InstructionPrompt,
  type ToolCallsPromptTemplate,
  type ToolDefinition,
  parseJSON,
  zodSchema,
  ollama,
  type OllamaCompletionModelSettings,
} from 'modelfusion';
import { z } from 'zod';

import { PublicKey } from '@dxos/keys';
import { log } from '@dxos/log';

import { multiline } from '../../../util';

export const mistralMultiToolCallOptions: OllamaCompletionModelSettings<any> = {
  model: 'mistral',
  promptTemplate: ollama.prompt.Mistral,
  raw: true, // Required when using custom prompt template.
  format: 'json',
  stopSequences: ['\n\n'], // Prevent infinite generation.
};

// Adapts ollama mistral model to use OpenAI functions.
export const mistralMultiToolCallPromptTemplate: ToolCallsPromptTemplate<string, InstructionPrompt> = {
  createPrompt: (instruction: string, tools: Array<ToolDefinition<string, unknown>>) => {
    log.info('createPrompt', { instruction, tools: tools.length });
    return {
      system: multiline(
        'Select the most suitable function from the list of available function below based on the input.',
        'Provide parameters using information from the current context.',
        'Provide your response in JSON format.',
        'Check that the parameters you provide match the schema provided by the function you select.',
        '',
        'Available functions:',
        ...tools.flatMap((tool) => [
          '',
          `${tool.name}:`,
          `- description: ${tool.description ?? ''}`,
          `- parameters: ${JSON.stringify(tool.parameters.getJsonSchema())}`,
        ]),
      ),
      instruction,
    };
  },

  extractToolCallsAndText: (response: string) => {
    // Mistral models answer with a JSON object with the following structure (when forcing JSON output):
    const json = parseJSON({
      text: response,
      schema: zodSchema(
        z.object({
          function: z.string(),
          parameters: z.any(),
        }),
      ),
    });

    log.info('extractToolCallsAndText', { response: json });
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
