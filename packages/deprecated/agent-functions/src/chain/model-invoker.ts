//
// Copyright 2024 DXOS.org
//

import { StringOutputParser } from '@langchain/core/output_parsers';
import { PromptTemplate } from '@langchain/core/prompts';
import { type RunnableLike, RunnableSequence } from '@langchain/core/runnables';
import { JsonOutputFunctionsParser } from 'langchain/output_parsers';
import { join } from 'node:path';

import { type Client } from '@dxos/client';
import { type Space } from '@dxos/client/echo';
import { log } from '@dxos/log';

import { type ChainResources, type ChainVariant, createChainResources } from './index';
import { getKey } from '../util';

export type ModelInvocationArgs = {
  space: Space;
  template: string;
  sequenceInput: string;
  templateSubstitutions: Record<string, any>;
  modelArgs?: any;
  outputFormat: 'text' | 'json';
};

export type CreateResourcesArgs = {
  dataDir?: string;
  model?: string;
};

export interface ModelInvoker {
  invoke(args: ModelInvocationArgs): Promise<any>;
}

export interface ModelInvokerFactoryApi {
  createModelInvoker(resources: ChainResources): ModelInvoker;

  createChainResources(client: Client, args: CreateResourcesArgs): ChainResources;
}

export class LangChainModelInvoker implements ModelInvoker {
  constructor(private readonly _resources: ChainResources) {}

  async invoke(args: ModelInvocationArgs): Promise<any> {
    // TODO(burdon): Factor out.
    const promptLogger: RunnableLike = (input) => {
      log.info('prompt', { prompt: input.value });
      return input;
    };
    const sequence = RunnableSequence.from([
      args.templateSubstitutions,
      PromptTemplate.fromTemplate(args.template),
      promptLogger,
      this._resources.model.bind(args.modelArgs),
      (args.outputFormat === 'json' ? new JsonOutputFunctionsParser() : new StringOutputParser()) as RunnableLike,
    ]);
    return sequence.invoke(args.sequenceInput);
  }
}

export class ModelInvokerFactory {
  private static _factory: ModelInvokerFactoryApi | null = null;

  public static createModelInvoker(resources: ChainResources): ModelInvoker {
    return this._factory?.createModelInvoker(resources) ?? new LangChainModelInvoker(resources);
  }

  public static createChainResources(client: Client, args: CreateResourcesArgs): ChainResources {
    return (
      this._factory?.createChainResources(client, args) ??
      createChainResources((process.env.DX_AI_MODEL as ChainVariant) ?? 'ollama', {
        baseDir: args.dataDir ? join(args.dataDir, 'agent/functions/embedding') : undefined,
        apiKey: getKey(client.config, 'openai.com/api_key'),
        embeddings: {
          model: args.model,
        },
        chat: {
          model: args.model,
        },
      })
    );
  }

  public static setFactory(factory: ModelInvokerFactoryApi | null) {
    this._factory = factory;
  }
}
