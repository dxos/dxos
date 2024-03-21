//
// Copyright 2024 DXOS.org
//

import { StringOutputParser } from '@langchain/core/output_parsers';
import { PromptTemplate } from '@langchain/core/prompts';
import { RunnableSequence } from '@langchain/core/runnables';
import { type BaseChatModel, type BaseChatModelCallOptions } from 'langchain/chat_models/base';

import { invariant } from '@dxos/invariant';
import { log } from '@dxos/log';

import { type Context, type PipelineFunction } from './pipeline';

export const transformer = <CallOptions extends BaseChatModelCallOptions>(
  model: BaseChatModel<CallOptions>,
): PipelineFunction => {
  return async (context: Context) => {
    const inputs: Record<string, any> = {};
    // const parseJson = true;
    // const modelArgs: any = parseJson
    //   ? {
    //       function_call: { name: 'output_formatter' },
    //       functions: [
    //         {
    //           name: 'output_formatter',
    //           parameters: {},
    //         },
    //       ],
    //     }
    //   : {};

    invariant(context.request.prompt?.template);

    const sequence = RunnableSequence.from([
      PromptTemplate.fromTemplate(context.request.prompt.template),
      model,
      new StringOutputParser(),
    ]);

    const result = await sequence.invoke({}, {});
    log.info('transformer', result);

    // TODO(burdon): Output graph.
    return context;
  };
};
