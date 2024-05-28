//
// Copyright 2024 DXOS.org
//

import { type BaseMessageLike } from '@langchain/core/messages';
import { Effect } from 'effect';

import { log } from '@dxos/log';

export type PromptInput = {
  name: string;
  type: 'const' | 'selection' | 'schema';
  value?: any;
};

export type PromptTemplate = {
  template: string;
  inputs?: PromptInput[];
};

export type Request = {
  prompt?: PromptTemplate;
  messages?: BaseMessageLike[];
};

export type Response = {
  code?: number;
  text?: string;
};

export type Context = {
  request: Request;
  response?: Response;
};

/**
 * Pipeline transform function.
 */
export type PipelineFunction = (context: Context) => Promise<Context>;

export const logger: PipelineFunction = async (context: Context) => {
  log('pipeline', context);
  return context;
};

export const tryFunction = (f: PipelineFunction) => (context: Context) => {
  return Effect.tryPromise({
    try: async () => f(context),
    catch: (err) => {
      // TODO(burdon): Cause isn't logged by dxos/log.
      return new Error('pipeline failed', { cause: err });
    },
  });
};
