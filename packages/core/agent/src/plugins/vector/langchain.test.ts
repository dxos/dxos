//
// Copyright 2023 DXOS.org
//

import { expect } from 'chai';
import { AgentExecutor } from 'langchain/agents';
import { formatLogToString } from 'langchain/agents/format_scratchpad/log';
import { ReActSingleInputOutputParser } from 'langchain/agents/react/output_parser';
import { ChatOpenAI } from 'langchain/chat_models/openai';
import { type Document } from 'langchain/document';
import { OpenAIEmbeddings } from 'langchain/embeddings/openai';
import { pull } from 'langchain/hub';
import { BufferMemory } from 'langchain/memory';
import { JsonOutputFunctionsParser } from 'langchain/output_parsers';
import {
  ChatPromptTemplate,
  HumanMessagePromptTemplate,
  type PromptTemplate,
  SystemMessagePromptTemplate,
} from 'langchain/prompts';
import { type AgentStep, type BaseMessage } from 'langchain/schema';
import { RunnableSequence } from 'langchain/schema/runnable';
import { Calculator } from 'langchain/tools/calculator';
import { renderTextDescription } from 'langchain/tools/render';
import { MemoryVectorStore } from 'langchain/vectorstores/memory';
import { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';

import { describe, test } from '@dxos/test';

import { getConfig, getKey } from './util';

const docs: Document[] = [
  {
    metadata: { id: 1 },
    pageContent: 'it was the best of times',
  },
  {
    metadata: { id: 2 },
    pageContent: 'it was the worst of times',
  },
  {
    metadata: { id: 3 },
    pageContent: 'it was the age of wisdom',
  },
  {
    metadata: { id: 4 },
    pageContent: 'it was the age of foolishness',
  },
];

describe('LangChain', () => {
  const createModel = (modelName = 'gpt-4') => {
    const config = getConfig()!;
    return new ChatOpenAI({
      openAIApiKey: process.env.COM_OPENAI_API_KEY ?? getKey(config, 'openai.com/api_key'),
      modelName,
    });
  };

  //
  // Vector stores.
  // TODO(burdon): CloudflareWorkersAIEmbeddings, FakeEmbeddings for tests.
  //
  test('vector', async () => {
    const config = getConfig()!;
    const embeddings = new OpenAIEmbeddings({
      openAIApiKey: process.env.COM_OPENAI_API_KEY ?? getKey(config, 'openai.com/api_key'),
    });

    const vectorStore = new MemoryVectorStore(embeddings);
    await vectorStore.addDocuments(docs);
    expect(vectorStore.memoryVectors.length).to.equal(docs.length);

    const results = await vectorStore.similaritySearchWithScore('the ages', 2);
    expect(results.map(([document]) => document.metadata.id)).to.deep.eq([3, 4]);
  });

  // TODO(burdon): Demo chat augmented with document (RAG).
  // TODO(burdon): Chains: http://localhost:3000/docs/modules/chains/document

  //
  // Structured output
  // http://localhost:3000/docs/modules/chains/popular/structured_output
  // TODO(burdon): How to make prompt satisfy all fields?
  //
  test.only('functions', async () => {
    const schema = z.object({
      company: z
        .array(
          z.object({
            name: z.string().describe('The name of the company'),
            website: z.string().describe('The URL of the company website'),
            public: z.boolean().describe('Public company'),
          }),
        )
        .describe('An array of companies mentioned in the text'),

      person: z
        .array(
          z.object({
            name: z.string().describe('The name of the person'),
            wiki: z.string().describe('The persons wikipedia article'),
          }),
        )
        .describe('An array of people mentioned in the text'),
    });

    const model = createModel().bind({
      functions: [
        {
          name: 'output_formatter',
          description: 'Should always be used to properly format output',
          parameters: zodToJsonSchema(schema),
        },
      ],
      function_call: { name: 'output_formatter' },
    });

    const outputParser = new JsonOutputFunctionsParser();

    {
      const prompt = new ChatPromptTemplate({
        promptMessages: [
          SystemMessagePromptTemplate.fromTemplate('List all people and companies mentioned in the following text.'),
          HumanMessagePromptTemplate.fromTemplate('{inputText}'),
        ],
        inputVariables: ['inputText'],
      });

      const chain = prompt.pipe(model).pipe(outputParser);
      const call = async (inputText: string) => {
        console.log(`> ${inputText}`);
        const response = await chain.invoke({ inputText });
        console.log(JSON.stringify(response, null, 2));
      };

      await call('Satya Nadella announced today that Microsoft will hire former OpenAI CEO Sam Altman.');
    }
  });

  //
  // Agents
  // http://localhost:3000/docs/modules/agents/agent_types/chat_conversation_agent
  //
  // TODO(burdon): http://localhost:3000/docs/modules/agents/agent_types/openai_assistant
  // TODO(burdon): http://localhost:3000/docs/modules/agents/agent_types/plan_and_execute
  //
  test('agent', async () => {
    // Bind stop token.
    // https://help.openai.com/en/articles/5072263-how-do-i-use-stop-sequences
    // The ReAct prompt used below (https://smith.langchain.com/hub/hwchase17/react-chat) uses the following format:
    //
    // Thought: Do I need to use a tool? Yes
    // Action: the action to take, should be one of [{tool_names}]
    // Action Input: the input to the action
    // Observation: the result of the action
    // ~~~~~~~~~~~
    const model = createModel().bind({ stop: ['\nObservation'] });

    // Tools.
    // https://api.js.langchain.com/classes/tools.Tool.html
    const tools = [
      // TODO(burdon): Custom tool
      // TODO(burdon): BraveSearch
      // TODO(burdon): VectorStoreQATool
      // TODO(burdon): WolframAlphaTool
      new Calculator(),
    ];
    const toolNames = tools.map((tool) => tool.name);

    // Get prompt form LangChain Hub.
    // ReAct prompts: generate both reasoning traces and task-specific actions in an interleaved manner.
    // https://www.promptingguide.ai/techniques/react
    // https://smith.langchain.com/hub/hwchase17/react-chat
    const basePrompt = await pull<PromptTemplate>('hwchase17/react-chat');
    const prompt = await basePrompt.partial({
      tools: renderTextDescription(tools),
      tool_names: toolNames.join(','),
    });

    // TODO(burdon): Import type def?
    type Input = { input: string; steps: AgentStep[]; chat_history: BaseMessage[] };
    const agent = RunnableSequence.from([
      {
        input: (i: Input) => i.input,
        agent_scratchpad: (i: Input) => formatLogToString(i.steps),
        chat_history: (i: Input) => i.chat_history,
      },
      prompt,
      model,
      new ReActSingleInputOutputParser({ toolNames }),
    ]);

    // TODO(burdon): Session state for agent.
    const memory = new BufferMemory({ memoryKey: 'chat_history' });

    // chat-conversational-react-description
    const executor = AgentExecutor.fromAgentAndTools({ agent, tools, memory });

    const chat = async (input: string) => {
      const result = await executor.invoke({ input });
      console.log(`> ${input}`);
      console.log(result.output);
    };

    console.log();
    await chat('hello, i am DXOS');
    await chat('what is my name?');
    await chat('what is 6 times 7?');
  });
});
