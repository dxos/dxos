//
// Copyright 2024 DXOS.org
//

import { type BaseFunctionCallOptions } from '@langchain/core/language_models/base';
import { type BaseChatModel } from '@langchain/core/language_models/chat_models';
import { AIMessage, type BaseMessage, HumanMessage } from '@langchain/core/messages';
import { StringOutputParser } from '@langchain/core/output_parsers';
import { type ChatPromptTemplate, PromptTemplate } from '@langchain/core/prompts';
import { type Tool } from '@langchain/core/tools';
import { ChatOpenAI } from '@langchain/openai';
import { expect } from 'chai';
import { AgentExecutor, createOpenAIFunctionsAgent, createReactAgent } from 'langchain/agents';
import { type AgentExecutorInput } from 'langchain/agents';
import { type BaseChain } from 'langchain/chains';
import { OllamaFunctions } from 'langchain/experimental/chat_models/ollama_functions';
import { PlanAndExecuteAgentExecutor } from 'langchain/experimental/plan_and_execute';
import { pull } from 'langchain/hub';
import { BufferMemory } from 'langchain/memory';
import { Calculator } from 'langchain/tools/calculator';
import defaultsDeep from 'lodash.defaultsdeep';
import { zodToJsonSchema } from 'zod-to-json-schema';

import { describe, test } from '@dxos/test';

import { getConfig, getKey } from '../../util';

// TODO(burdon): Bug requires conversion.
const toChatHistory = async (memory: BufferMemory): Promise<string[]> => {
  const messages = await memory.chatHistory.getMessages();

  const getName = (message: BaseMessage) => {
    if (message instanceof HumanMessage) {
      return memory.humanPrefix ?? 'Human';
    } else if (message instanceof AIMessage) {
      return memory.aiPrefix ?? 'AI';
    } else {
      throw new Error('Invalid message type.');
    }
  };

  return messages.map((message) => `${getName(message)}: ${message.content}`);
};

const createInvoker = (executor: BaseChain, memory?: BufferMemory) => async (input: string) => {
  const messages = await memory?.chatHistory.getMessages();
  const result = await executor.invoke({ input, chat_history: messages });

  await memory?.chatHistory.addUserMessage(input);
  await memory?.chatHistory.addAIChatMessage(result.output);

  console.log(`\n> ${input}`);
  console.log(result.output);
  return result;
};

type ModelOptions = {
  model?: string;
  temperature?: number;
  verbose?: boolean;
};

const defaultModelOptions: ModelOptions = {
  temperature: 0.1,
  verbose: true,
};

const createModel = (
  type: 'openai' | 'ollama',
  { model, ...rest }: ModelOptions = {},
): BaseChatModel<BaseFunctionCallOptions> => {
  const config = getConfig()!;
  switch (type) {
    case 'openai': {
      return new ChatOpenAI(
        defaultsDeep(
          {
            openAIApiKey: process.env.COM_OPENAI_API_KEY ?? getKey(config, 'openai.com/api_key'),
            modelName: model ?? 'gpt-3.5-turbo-0125',
          },
          rest,
          defaultModelOptions,
        ),
      );
    }

    // https://js.langchain.com/docs/modules/agents/agent_types
    // If you are using an OpenAI model, or an open-source model that has been fine-tuned for function calling and exposes the same functions parameters as OpenAI.
    case 'ollama': {
      return new OllamaFunctions(
        defaultsDeep(
          {
            model: model ?? 'mistral',
          },
          rest,
          defaultModelOptions,
        ),
      );
    }
  }
};

//
// Agents, ReAct prompts, and Tools.
// https://js.langchain.com/docs/modules/agents/agent_types/chat_conversation_agent
// TODO(burdon): https://js.langchain.com/docs/modules/agents/agent_types/openai_assistant
//
describe.only('Agent', () => {
  // type Input = { input: string; steps: AgentStep[]; chat_history: BaseMessage[] };
  // const agent = RunnableSequence.from([
  //   {
  //     input: (i: Input) => i.input,
  //     agent_scratchpad: (i: Input) => formatLogToString(i.steps),
  //     chat_history: (i: Input) => i.chat_history,
  //   },
  //   prompt,
  //   model,
  //   new ReActSingleInputOutputParser({ toolNames }),
  // ]);

  // Bind stop token.
  // https://help.openai.com/en/articles/5072263-how-do-i-use-stop-sequences
  // The ReAct prompt used below (https://smith.langchain.com/hub/hwchase17/react-chat) uses the following format:
  //
  // Thought: Do I need to use a tool? Yes
  // Action: the action to take, should be one of [{tool_names}]
  // Action Input: the input to the action
  // Observation: the result of the action
  // ~~~~~~~~~~~
  // const model = baseModel.bind({ stop: ['\nObservation'] });

  // Get prompt form LangChain Hub.
  // ReAct prompts: generate both reasoning traces and task-specific actions in an interleaved manner.
  // https://www.promptingguide.ai/techniques/react
  // https://smith.langchain.com/hub/hwchase17/react-chat

  // TODO(burdon): See: chat-conversational-react-description
  //  https://js.langchain.com/docs/modules/agents/agent_types/plan_and_execute
  //  https://github.com/langchain-ai/langchainjs/blob/main/langchain/src/agents/executor.ts

  // TODO(burdon): Langchain API has massive churn and requires shims like this to convert types.
  //  E.g., ollama doesn't seem to work with tools or agents (posted Discord message).
  //  1. react + tools throws error: Failed to parse a function call from mistral output.
  //  2. invoking createOpenAIFunctionsAgent hangs.

  const options: Partial<AgentExecutorInput> = {
    returnIntermediateSteps: true,
  };

  test('sanity', async () => {
    const llm = createModel('ollama');
    const tools: Tool[] = [];
    const prompt = await pull<ChatPromptTemplate>('hwchase17/openai-functions-agent');
    const agent = await createOpenAIFunctionsAgent({ llm, tools, prompt });
    const executor = new AgentExecutor({ ...options, agent, tools });
    const invoker = createInvoker(executor);

    await invoker('hello');
  });

  // TODO(burdon): Mistral doesn't use the prompt to select a tool.
  // https://platform.openai.com/docs/guides/function-calling
  // https://js.langchain.com/docs/integrations/chat/mistral#tool-calling
  test('PlanAndExecuteAgentExecutor with tools', async () => {
    const llm = createModel('ollama');
    const tools: Tool[] = [new Calculator()];
    const executor = await PlanAndExecuteAgentExecutor.fromLLMAndTools({ ...options, llm, tools });
    const invoker = createInvoker(executor);

    await invoker('what is 6x7?');
  });

  // https://js.langchain.com/docs/integrations/chat/mistral#tool-calling
  test('tools', async () => {
    const tools: Tool[] = [new Calculator()];
    const result = await tools[0].call('1+1');
    expect(result).to.eq('2');

    const options: BaseFunctionCallOptions = {
      functions: [
        {
          name: 'calculator',
          description: tools[0].description,
          parameters: {
            type: 'object',
            properties: zodToJsonSchema(tools[0].schema),
          },
        },
      ],
      function_call: {
        name: 'calculator',
      },
    };

    const llm = createModel('ollama', { model: 'mixtral' }).bind(options);
    const prompt = PromptTemplate.fromTemplate('you are a useful assistant');
    const chain = prompt.pipe(llm).pipe(new StringOutputParser());
    const response = await chain.invoke({ input: 'what is 6x7?' });
    console.log(response);
  });

  // https://js.langchain.com/docs/modules/agents/agent_types/react#create-agent
  // https://github.com/langchain-ai/langchainjs/blob/main/examples/src/models/chat/ollama_functions/function_calling.ts
  test('createReactAgent with tools', async () => {
    const llm = createModel('ollama', { model: 'mixtral' });
    const tools: Tool[] = [new Calculator()];
    const prompt = await pull<ChatPromptTemplate>('hwchase17/react');
    const agent = await createReactAgent({ llm, tools, prompt });
    const executor = new AgentExecutor({ ...options, agent, tools });
    const invoker = createInvoker(executor);

    await invoker('what is 6x7?');
  });

  // TODO(burdon): Doesn't work with tools with openai or ollama.
  // https://js.langchain.com/docs/modules/agents/how_to/custom_agent#create-the-agent
  // https://github.com/langchain-ai/langchainjs/blob/main/examples/src/agents/react.ts
  test('fromAgentAndTools', async () => {
    const llm = createModel('openai');
    const tools: Tool[] = [new Calculator()];
    const prompt = await pull<PromptTemplate>('hwchase17/react-chat');
    const agent = await createReactAgent({ llm, tools, prompt });

    // NOTE: Doesn't work to pass in memory; chat_history required by executor invoke method.
    const executor = new AgentExecutor({ ...options, agent, tools });
    const memory = new BufferMemory({ humanPrefix: 'User', aiPrefix: 'AI' });
    const invoker = createInvoker(executor, memory);

    await invoker('hello, my name is DXOS');
    await invoker('what is my name?');
    await invoker('what is 6x7?');
  });

  // TODO(burdon): Write custom BaseChain based on AgentExecutor (langchain/src/agents).
  // TODO(burdon): Figure out how to invoke tool from basics.
  // TODO(burdon): Create custom tool and check is invoked.
  // TODO(burdon): Error.
  //  InputFormatError: Error: Field "chat_history" in prompt uses a MessagesPlaceholder, which expects an array of BaseMessages as an input value. Received: [

  // https://api.js.langchain.com/functions/langchain_agents.createOpenAIFunctionsAgent.html
  test.only('createOpenAIFunctionsAgent', async () => {
    const llm = createModel('openai');
    const tools: Tool[] = [new Calculator()];
    const prompt = await pull<ChatPromptTemplate>('hwchase17/openai-functions-agent');
    const agent = await createOpenAIFunctionsAgent({ llm, tools, prompt });
    const executor = new AgentExecutor({ ...options, agent, tools });
    const memory = new BufferMemory({ humanPrefix: 'User', aiPrefix: 'AI' });
    const invoker = createInvoker(executor, memory);

    await invoker('hello, my name is DXOS');
    await invoker('what is my name?');
    await invoker('what is 6x7?');
  });
});
