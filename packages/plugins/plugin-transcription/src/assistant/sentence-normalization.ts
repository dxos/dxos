//
// Copyright 2025 DXOS.org
//

import { effect } from '@preact/signals-core';
import { Schema } from 'effect';

import { DEFAULT_EDGE_MODEL } from '@dxos/ai';
import { AISession } from '@dxos/assistant';
import { type Context, Resource } from '@dxos/context';
import { type Queue } from '@dxos/echo-db';
import { create } from '@dxos/echo-schema';
import { AiService, defineFunction, type FunctionExecutor } from '@dxos/functions';
import { ObjectId } from '@dxos/keys';
import { log } from '@dxos/log';
import { DataType } from '@dxos/schema';

import { getActorId } from './utils';

const OutputSchema = Schema.Struct({
  sentences: Schema.Array(Schema.String).annotations({
    description: 'The sentences of the transcript.',
  }),
  messages: Schema.Array(DataType.Message).annotations({
    description: 'The remapped messages based on the sentences.',
  }),
});

const _MAXIMUM_MESSAGES_COMBINED = 10;
const _OVERLAP_MESSAGES = 1;

const prompt = `
You are observing a real-time transcript of a single person speaking.
The transcription is delivered in chunks of 10 seconds or less. As a result, individual sentences may be split across multiple messages, or multiple sentences may appear within a single message. Additionally, because this is real-time transcription, punctuation and capitalization may be incorrect or missing.

# Task Description:
  - Your task is to detect and reconstruct broken or incomplete sentences by merging fragments into coherent, grammatically correct sentences where appropriate.

# Output Format:
  - You have been provided with the tool that describes the output format, make sure to query it.
  - Do not output anything else than the output format.

# Sentence Handling Rules:
  - Each complete sentence should be added as a separate string to output, preserving the original order.
  - Last sentence could be incomplete, but it should be outputted as a separate string.

# Punctuation and Capitalization:
  - Do not rely on the original punctuation and capitalization—they may be incorrect.
  - Use logical reasoning to insert appropriate punctuation (e.g., period, comma, question mark, exclamation mark) and capitalization.

# Restrictions:
  - Do not alter the order of the original messages; maintain the natural flow of speech.
  - Do not interpret or infer meaning beyond reconstructing sentences.
  - Do not add or remove any words or phrases.
`;

export const sentenceNormalization = defineFunction({
  description: 'Post process of transcription for sentence normalization',
  inputSchema: Schema.Struct({
    messages: Schema.Array(Schema.String).annotations({
      description: 'Messages to normalize into sentences.',
    }),
  }),
  outputSchema: OutputSchema,
  handler: async ({ data: { messages }, context }) => {
    log.info('input', { messages });
    const ai = context.getService(AiService);
    const session = new AISession({ operationModel: 'configured' });

    const response = await session.runStructured(OutputSchema, {
      generationOptions: { model: DEFAULT_EDGE_MODEL },
      client: ai.client,
      tools: [],
      artifacts: [],
      history: [
        {
          id: ObjectId.random(),
          role: 'user',
          content: messages.map((block) => ({ type: 'text', text: block })),
        },
      ],
      prompt,
    });

    log.info('response', { response });
    return response;
  },
});

export type MessagesNormalizerParams = {
  functionExecutor: FunctionExecutor;
  queue: Queue<DataType.Message>;
  startCursor: QueueCursor;
};

type QueueCursor = {
  timestamp: string;
  actorId: string;
};

export class MessagesNormalizer extends Resource {
  private readonly _functionExecutor: FunctionExecutor;
  private readonly _queue: Queue<DataType.Message>;
  private _currentCursor: QueueCursor;
  private _buffer = '';

  constructor({ functionExecutor, queue, startCursor }: MessagesNormalizerParams) {
    super();
    this._functionExecutor = functionExecutor;
    this._queue = queue;
    this._currentCursor = startCursor;
  }

  protected override async _open(ctx: Context): Promise<void> {
    // Subscribe to queue changes.
    const unsubscribeSignal = effect(() => {
      const messages = this._queue.items;
      this._processMessages(messages).catch(log.error);
    });
    this._ctx.onDispose(() => unsubscribeSignal());
  }

  public get currentCursor() {
    return this._currentCursor;
  }

  // Need to unpack strings from blocks from messages run them through the function and then pack them back into blocks into messages.
  private async _processMessages(messages: DataType.Message[]) {
    const currentCursor = this._currentCursor;
    const messagesToProcess = getMessagesAfterCursor(messages, currentCursor);
    if (messagesToProcess.length === 0) {
      return;
    }

    // Extract transcription text from message blocks
    const transcriptionTexts = messagesToProcess.flatMap((message) =>
      message.blocks.filter((block) => block.type === 'transcription').map((block) => block.text),
    );

    if (transcriptionTexts.length === 0) {
      return;
    }

    // Process through sentence normalization
    const result = await this._functionExecutor.invoke(sentenceNormalization, {
      messages: transcriptionTexts,
    });

    const message = create(DataType.Message, {
      ...messagesToProcess[0],
      blocks: result.sentences.map((sentence) => ({
        ...messagesToProcess[0].blocks[0],
        text: sentence,
      })),
    });

    this._queue.delete(messagesToProcess.map((message) => message.id));
    this._queue.append([message]);

    this._currentCursor = {
      timestamp: message.created,
      actorId: getActorId(message.sender),
    };
  }
}

const getMessagesAfterCursor = (messages: DataType.Message[], cursor: QueueCursor) => {
  return messages.filter((message) => {
    const actorId = getActorId(message.sender);
    return message.created >= cursor.timestamp && actorId === cursor.actorId;
  });
};
