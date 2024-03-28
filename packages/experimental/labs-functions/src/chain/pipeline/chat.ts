//
// Copyright 2024 DXOS.org
//

import * as JSONSchema from '@effect/schema/JSONSchema';
import type * as S from '@effect/schema/Schema';
import { type BaseFunctionCallOptions, type BaseLanguageModelCallOptions } from '@langchain/core/language_models/base';
import { StringOutputParser } from '@langchain/core/output_parsers';
import { ChatPromptTemplate, PromptTemplate } from '@langchain/core/prompts';
import { RunnableSequence } from '@langchain/core/runnables';
import { type BaseChatModel } from 'langchain/chat_models/base';
import { JsonOutputFunctionsParser } from 'langchain/output_parsers';

import { invariant } from '@dxos/invariant';

import { type Context, type PipelineFunction } from './pipeline';

export const chat = (model: BaseChatModel<BaseLanguageModelCallOptions>): PipelineFunction => {
  return async ({ request }: Context) => {
    invariant(request.prompt?.template);
    const sequence = RunnableSequence.from([
      //
      PromptTemplate.fromTemplate(request.prompt.template),
      model,
      new StringOutputParser(),
    ]);

    const result = await sequence.invoke({}, {});
    return {
      request,
      response: {
        text: result,
      },
    };
  };
};

export type JSONChatOptions = {
  schema?: S.Schema<any>;
};

export const jsonChat = (
  model: BaseChatModel<BaseFunctionCallOptions>,
  options: JSONChatOptions = {},
): PipelineFunction => {
  return async ({ request }: Context) => {
    invariant(request.messages);
    invariant(options.schema);

    const jsonSchema = JSONSchema.make(options.schema);

    // TODO(burdon): OpenAI only?
    // https://js.langchain.com/docs/modules/model_io/output_parsers/types/json_functions
    const callOptions: BaseFunctionCallOptions = {
      function_call: { name: 'output_formatter' },
      functions: [
        {
          name: 'output_formatter',
          description: 'Should always be used to properly format output.',
          parameters: jsonSchema as any,
        },
      ],
    };

    const message = ChatPromptTemplate.fromMessages(request.messages);

    const sequence = RunnableSequence.from([
      //
      message,
      model.bind(callOptions),
      new JsonOutputFunctionsParser(),
    ]);

    const result = await sequence.invoke({}, {});
    return {
      request,
      response: {
        text: result,
      },
    };
  };
};
