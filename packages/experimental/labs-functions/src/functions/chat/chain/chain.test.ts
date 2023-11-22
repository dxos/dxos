//
// Copyright 2023 DXOS.org
//

import { expect } from 'chai';
import fs from 'fs';
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
  PromptTemplate,
  SystemMessagePromptTemplate,
} from 'langchain/prompts';
import { type AgentStep, type BaseMessage } from 'langchain/schema';
import { StringOutputParser } from 'langchain/schema/output_parser';
import { RunnableSequence, RunnablePassthrough } from 'langchain/schema/runnable';
import { RecursiveCharacterTextSplitter } from 'langchain/text_splitter';
import { Calculator } from 'langchain/tools/calculator';
import { renderTextDescription } from 'langchain/tools/render';
import { formatDocumentsAsString } from 'langchain/util/document';
import { HNSWLib } from 'langchain/vectorstores/hnswlib';
import { MemoryVectorStore } from 'langchain/vectorstores/memory';
import path from 'node:path';
import { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';

import { describe, test } from '@dxos/test';

import { Chain, ChainResources } from './chain';
import { getConfig, getKey } from '../../../util';

// TODO(burdon): Demo:
//  - Email pipeline (summarize daily set of messages from contacts in CRM).
//  - Document processing queue (not on each mutation).
//  - Chat RAG.
//  - Drag results into Grid/Stack.
//  - Suggest cards in Email view.

// TODO(burdon): Scripts/notebook with agent plugin/functions
// TODO(burdon): Graph database: https://js.langchain.com/docs/modules/data_connection/experimental/graph_databases/neo4j
// TODO(burdon): Document chains: http://localhost:3000/docs/modules/chains/document
// TODO(burdon): Summarize: https://js.langchain.com/docs/modules/chains/popular/summarize
// TODO(burdon): Plugins: https://platform.openai.com/docs/plugins/examples
// TODO(burdon): FakeEmbeddings for tests

describe.skip('LangChain', () => {
  const createModel = (modelName = 'gpt-4') => {
    const config = getConfig()!;

    // Pre-trained transformer (LLM).
    // https://platform.openai.com/docs/guides/text-generation
    // TODO(burdon): Alt: https://developers.cloudflare.com/workers-ai/models/text-generation
    return new ChatOpenAI({
      openAIApiKey: process.env.COM_OPENAI_API_KEY ?? getKey(config, 'openai.com/api_key'),
      modelName,
    });
  };

  const createEmbeddings = () => {
    const config = getConfig()!;

    // Text embeddings measure the relatedness of text strings.
    // https://platform.openai.com/docs/guides/embeddings
    // TODO(burdon): Alt: https://developers.cloudflare.com/workers-ai/models/text-embeddings
    return new OpenAIEmbeddings({
      openAIApiKey: process.env.COM_OPENAI_API_KEY ?? getKey(config, 'openai.com/api_key'),
    });
  };

  //
  // Vector stores.
  //
  test('vector', async () => {
    const embeddings = createEmbeddings();

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

    const vectorStore = new MemoryVectorStore(embeddings);
    await vectorStore.addDocuments(docs);
    expect(vectorStore.memoryVectors.length).to.equal(docs.length);

    const results = await vectorStore.similaritySearchWithScore('the ages', 2);
    expect(results.map(([document]) => document.metadata.id)).to.deep.eq([3, 4]);
    console.log(results);
  });

  //
  // Retriever Augmented Generation (RAG).
  // https://js.langchain.com/docs/expression_language/cookbook/retrieval
  //
  test('rag', async () => {
    const embeddings = createEmbeddings();
    const model = createModel();

    const docs: Document[] = [
      {
        metadata: { id: 1 },
        pageContent: 'DXOS consists of HALO, ECHO and MESH.',
      },
      {
        metadata: { id: 2 },
        pageContent: 'HALO is a mechanism for self-sovereign identity.',
      },
      {
        metadata: { id: 3 },
        pageContent: 'ECHO is a decentralized graph database.',
      },
      {
        metadata: { id: 4 },
        pageContent: 'MESH provides infrastructure for resilient peer-to-peer networks.',
      },
    ];

    // Hierarchical Navigable Small World (HNSW) graph.
    // https://api.js.langchain.com/classes/vectorstores_hnswlib.HNSWLib.html
    // https://js.langchain.com/docs/modules/data_connection/retrievers/how_to/vectorstore
    // https://github.com/langchain-ai/langchainjs/discussions/2842
    const vectorStore = await HNSWLib.fromDocuments([], embeddings);
    await vectorStore.addDocuments(docs);

    const retriever = vectorStore.asRetriever();
    const prompt = PromptTemplate.fromTemplate(
      [
        'answer the question based only on the following context:',
        '{context}',
        '----------------',
        'question: {question}',
      ].join('\n'),
    );

    const agent = RunnableSequence.from([
      {
        context: retriever.pipe(formatDocumentsAsString),
        question: new RunnablePassthrough(),
      },
      prompt,
      model,
      new StringOutputParser(),
    ]);

    const call = async (inputText: string) => {
      console.log(`\n> ${inputText}`);
      const result = await agent.invoke(inputText);
      console.log(result);
      return result;
    };

    await call('what kind of database does DXOS use?');
  });

  //
  // Retriever Augmented Generation (RAG).
  // https://js.langchain.com/docs/modules/chains/popular/vector_db_qa
  //
  test('retrieval', async () => {
    const model = createModel();
    const embeddings = createEmbeddings();

    // Get data.
    const text = fs.readFileSync(path.join(__dirname, 'testing/text.txt'), 'utf8');
    const textSplitter = new RecursiveCharacterTextSplitter({ chunkSize: 1000 });
    const docs = await textSplitter.createDocuments([text]);

    const vectorStore = await HNSWLib.fromDocuments(docs, embeddings);
    const retriever = vectorStore.asRetriever(1); // Sets max docs to retrieve.

    // Create a system & human prompt for the chat model
    const prompt = ChatPromptTemplate.fromMessages([
      SystemMessagePromptTemplate.fromTemplate(
        [
          'Use the following pieces of context to answer the question at the end.',
          "If you don't know the answer, just say that you don't know, don't try to make up an answer.",
          '----------------',
          '{context}',
        ].join('\n'),
      ),
      HumanMessagePromptTemplate.fromTemplate('{question}'),
    ]);

    const chain = RunnableSequence.from([
      {
        context: retriever.pipe(formatDocumentsAsString),
        question: new RunnablePassthrough(),
      },
      prompt,
      model,
      new StringOutputParser(),
    ]);

    const call = async (inputText: string) => {
      console.log(`\n> ${inputText}`);
      const result = await chain.invoke(inputText);
      console.log(result);
      return result;
    };

    await call('What did Satya Nadella say about Sam Altman?');
  });

  //
  // Structured output
  // http://localhost:3000/docs/modules/chains/popular/structured_output
  // TODO(burdon): How to make prompt satisfy all fields?
  //
  test('functions', async () => {
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
      function_call: { name: 'output_formatter' },
      functions: [
        {
          name: 'output_formatter',
          description: 'Should always be used to properly format output',
          parameters: zodToJsonSchema(schema),
        },
      ],
    });

    const outputParser = new JsonOutputFunctionsParser();

    const prompt = new ChatPromptTemplate({
      inputVariables: ['inputText'],
      promptMessages: [
        SystemMessagePromptTemplate.fromTemplate('List all people and companies mentioned in the following text.'),
        HumanMessagePromptTemplate.fromTemplate('{inputText}'),
      ],
    });

    const chain = prompt.pipe(model).pipe(outputParser);

    const call = async (inputText: string) => {
      console.log(`\n> ${inputText}`);
      const result = await chain.invoke({ inputText });
      console.log(JSON.stringify(result, null, 2));
      return result;
    };

    await call('Satya Nadella announced today that Microsoft will hire former OpenAI CEO Sam Altman.');
  });

  //
  // Agents, ReAct prompts, and Tools.
  // http://localhost:3000/docs/modules/agents/agent_types/chat_conversation_agent
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

    const memory = new BufferMemory({ memoryKey: 'chat_history' });

    // TODO(burdon): See: chat-conversational-react-description
    const executor = AgentExecutor.fromAgentAndTools({ agent, tools, memory });

    const call = async (input: string) => {
      const result = await executor.invoke({ input });
      console.log(`\n> ${input}`);
      console.log(result.output);
      return result;
    };

    await call('hello, i am DXOS');
    await call('what is my name?');
    await call('what is 6 times 7?');
  });

  test.only('chain', async () => {
    const docs: Document[] = [
      {
        metadata: { id: 1 },
        pageContent: 'DXOS consists of HALO, ECHO and MESH.',
      },
      {
        metadata: { id: 2 },
        pageContent: 'HALO is a mechanism for self-sovereign identity.',
      },
      {
        metadata: { id: 3 },
        pageContent: 'ECHO is a decentralized graph database.',
      },
      {
        metadata: { id: 4 },
        pageContent: 'MESH provides infrastructure for resilient peer-to-peer networks.',
      },
    ];

    const config = getConfig()!;
    const resources = new ChainResources({
      apiKey: process.env.COM_OPENAI_API_KEY ?? getKey(config, 'openai.com/api_key')!,
      chat: { modelName: 'gpt-4' },
    });

    await resources.initialize();
    await resources.vectorStore.addDocuments(docs);

    const chain = new Chain(resources);
    {
      const result = await chain.call('what kind of database does DXOS use?');
      console.log(`> ${result}`);
    }
    {
      const result = await chain.call('what is HALO part of?');
      console.log(`> ${result}`);
    }
    {
      const result = await chain.call('what language is MESH written in?');
      console.log(`> ${result}`);
    }
  });
});
