//
// Copyright 2024 DXOS.org
//

import { createSystemPrompt } from '@dxos/artifact';
import { DEFAULT_LLM_MODEL, type GenerateRequest } from '@dxos/assistant';
import { AST, S, toJsonSchema } from '@dxos/echo-schema';

export const createProcessorOptions = (artifacts: string[]): Pick<GenerateRequest, 'model' | 'systemPrompt'> => ({
  model: DEFAULT_LLM_MODEL,
  systemPrompt: createSystemPrompt({ artifacts }),
});

export const functions = [
  {
    name: 'example.com/function/chess',
    version: '0.1.0',
    inputSchema: toJsonSchema(
      S.Struct({
        level: S.Number.annotations({
          [AST.TitleAnnotationId]: 'Level',
        }),
      }),
    ),
  },
  {
    name: 'example.com/function/forex',
    version: '0.1.0',
    binding: 'FOREX',
    inputSchema: toJsonSchema(
      S.Struct({
        from: S.String.annotations({
          [AST.TitleAnnotationId]: 'Currency from',
        }),
        to: S.String.annotations({
          [AST.TitleAnnotationId]: 'Currency to',
        }),
      }),
    ),
  },
];
