//
// Copyright 2025 DXOS.org
//

import { AiInput } from '@effect/ai';
import { describe, it } from '@effect/vitest';
import { Effect, Either } from 'effect';

import { Obj } from '@dxos/echo';
import { DataType } from '@dxos/schema';

import { preprocessAiInput } from './AiPreprocessor';
import { AiInputPreprocessingError } from './errors';

describe('preprocessor', () => {
  it.effect(
    'should preprocess simple user message with text',
    Effect.fn(function* ({ expect }) {
      const message = Obj.make(DataType.Message, {
        created: new Date().toISOString(),
        sender: { role: 'user' },
        blocks: [
          {
            _tag: 'text',
            text: 'What is 2 + 2?',
          },
        ],
      });
      const input = yield* preprocessAiInput([message]);
      expect(input).toEqual(
        AiInput.make(
          new AiInput.UserMessage({
            parts: [new AiInput.TextPart({ text: 'What is 2 + 2?' })],
          }),
        ),
      );
    }),
  );

  it.effect(
    'should handle multiple tool results at the start of a message',
    Effect.fn(function* ({ expect }) {
      const message = Obj.make(DataType.Message, {
        created: new Date().toISOString(),
        sender: { role: 'user' },
        blocks: [
          {
            _tag: 'toolResult',
            toolCallId: 'call_1',
            name: 'calculator',
            result: JSON.stringify('Result of tool 1'),
          },
          {
            _tag: 'toolResult',
            toolCallId: 'call_2',
            name: 'calculator',
            result: JSON.stringify('Result of tool 2'),
          },
          {
            _tag: 'text',
            text: 'What do you think about these results?',
          },
        ],
      });

      const input = yield* preprocessAiInput([message]);
      expect(input.messages).toHaveLength(2);

      // First message should be tool results.
      expect(input.messages[0]).toBeInstanceOf(AiInput.ToolMessage);
      const toolMessage = input.messages[0] as AiInput.ToolMessage;
      expect(toolMessage.parts).toHaveLength(2);
      expect(toolMessage.parts[0]).toEqual(
        new AiInput.ToolCallResultPart({
          id: AiInput.ToolCallId.make('call_1'),
          name: 'calculator',
          result: 'Result of tool 1',
        }),
      );
      expect(toolMessage.parts[1]).toEqual(
        new AiInput.ToolCallResultPart({
          id: AiInput.ToolCallId.make('call_2'),
          name: 'calculator',
          result: 'Result of tool 2',
        }),
      );

      // Second message should be user text.
      expect(input.messages[1]).toBeInstanceOf(AiInput.UserMessage);
      const userMessage = input.messages[1] as AiInput.UserMessage;
      expect(userMessage.parts).toEqual([new AiInput.TextPart({ text: 'What do you think about these results?' })]);
    }),
  );

  it.effect(
    'should handle assistant message with tool calls',
    Effect.fn(function* ({ expect }) {
      const message = Obj.make(DataType.Message, {
        created: new Date().toISOString(),
        sender: { role: 'assistant' },
        blocks: [
          {
            _tag: 'text',
            text: 'I need to calculate something.',
          },
          {
            _tag: 'toolCall',
            toolCallId: 'call_1',
            name: 'calculator',
            input: JSON.stringify({ operation: 'add', a: 2, b: 2 }),
          },
          {
            _tag: 'text',
            text: 'Let me process that for you.',
          },
        ],
      });

      const input = yield* preprocessAiInput([message]);
      expect(input.messages).toHaveLength(1);

      const assistantMessage = input.messages[0] as AiInput.AssistantMessage;
      expect(assistantMessage.parts).toHaveLength(3);
      expect(assistantMessage.parts[0]).toEqual(new AiInput.TextPart({ text: 'I need to calculate something.' }));
      expect(assistantMessage.parts[1]).toEqual(
        new AiInput.ToolCallPart({
          id: 'call_1',
          name: 'calculator',
          params: { operation: 'add', a: 2, b: 2 },
        }),
      );
      expect(assistantMessage.parts[2]).toEqual(new AiInput.TextPart({ text: 'Let me process that for you.' }));
    }),
  );

  it.effect(
    'should handle assistant message with reasoning',
    Effect.fn(function* ({ expect }) {
      const message = Obj.make(DataType.Message, {
        created: new Date().toISOString(),
        sender: { role: 'assistant' },
        blocks: [
          {
            _tag: 'reasoning',
            reasoningText: 'Let me think about this step by step...',
            signature: 'reasoning_sig_1',
          },
          {
            _tag: 'text',
            text: 'Based on my reasoning, the answer is 4.',
          },
        ],
      });

      const input = yield* preprocessAiInput([message]);
      const assistantMessage = input.messages[0] as AiInput.AssistantMessage;
      expect(assistantMessage.parts[0]).toEqual(
        new AiInput.ReasoningPart({
          reasoningText: 'Let me think about this step by step...',
          signature: 'reasoning_sig_1',
        }),
      );
    }),
  );

  it.effect(
    'should handle redacted reasoning',
    Effect.fn(function* ({ expect }) {
      const message = Obj.make(DataType.Message, {
        created: new Date().toISOString(),
        sender: { role: 'assistant' },
        blocks: [
          {
            _tag: 'reasoning',
            redactedText: '[Reasoning redacted]',
          },
        ],
      });

      const input = yield* preprocessAiInput([message]);
      const assistantMessage = input.messages[0] as AiInput.AssistantMessage;
      expect(assistantMessage.parts[0]).toEqual(
        new AiInput.RedactedReasoningPart({
          redactedText: '[Reasoning redacted]',
        }),
      );
    }),
  );

  it.effect(
    'should handle user message with image (base64)',
    Effect.fn(function* ({ expect }) {
      const message = Obj.make(DataType.Message, {
        created: new Date().toISOString(),
        sender: { role: 'user' },
        blocks: [
          {
            _tag: 'image',
            source: {
              type: 'base64',
              mediaType: 'image/png',
              data: 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChAGA', // 1x1 transparent PNG
            },
          },
        ],
      });

      const input = yield* preprocessAiInput([message]);
      const userMessage = input.messages[0] as AiInput.UserMessage;
      expect(userMessage.parts[0]).toBeInstanceOf(AiInput.ImagePart);
      const imagePart = userMessage.parts[0] as AiInput.ImagePart;
      expect(imagePart.mediaType).toBe('image/png');
      expect(imagePart.data).toBeInstanceOf(Uint8Array);
    }),
  );

  it.effect(
    'should handle user message with image (URL)',
    Effect.fn(function* ({ expect }) {
      const message = Obj.make(DataType.Message, {
        created: new Date().toISOString(),
        sender: { role: 'user' },
        blocks: [
          {
            _tag: 'image',
            source: {
              type: 'http',
              url: 'https://example.com/image.png',
            },
          },
        ],
      });

      const input = yield* preprocessAiInput([message]);
      const userMessage = input.messages[0] as AiInput.UserMessage;
      expect(userMessage.parts[0]).toEqual(
        new AiInput.ImageUrlPart({
          url: new URL('https://example.com/image.png'),
        }),
      );
    }),
  );

  it.effect(
    'should handle user message with file reference',
    Effect.fn(function* ({ expect }) {
      const message = Obj.make(DataType.Message, {
        created: new Date().toISOString(),
        sender: { role: 'user' },
        blocks: [
          {
            _tag: 'file',
            url: 'https://example.com/document.pdf',
          },
        ],
      });

      const input = yield* preprocessAiInput([message]);
      const userMessage = input.messages[0] as AiInput.UserMessage;
      expect(userMessage.parts[0]).toEqual(
        new AiInput.FileUrlPart({
          url: new URL('https://example.com/document.pdf'),
        }),
      );
    }),
  );

  it.effect(
    'should handle user message with transcript',
    Effect.fn(function* ({ expect }) {
      const message = Obj.make(DataType.Message, {
        created: new Date().toISOString(),
        sender: { role: 'user' },
        blocks: [
          {
            _tag: 'transcript',
            text: 'This is a transcript of the conversation.',
            started: new Date().toISOString(),
          },
        ],
      });

      const input = yield* preprocessAiInput([message]);
      const userMessage = input.messages[0] as AiInput.UserMessage;
      expect(userMessage.parts[0]).toEqual(
        new AiInput.TextPart({
          text: 'This is a transcript of the conversation.',
        }),
      );
    }),
  );

  it.effect(
    'should handle mixed content with tool results and text',
    Effect.fn(function* ({ expect }) {
      const message = Obj.make(DataType.Message, {
        created: new Date().toISOString(),
        sender: { role: 'user' },
        blocks: [
          {
            _tag: 'text',
            text: 'Here are the results:',
          },
          {
            _tag: 'toolResult',
            toolCallId: 'call_1',
            name: 'calculator',
            result: JSON.stringify('First result'),
          },
          {
            _tag: 'toolResult',
            toolCallId: 'call_2',
            name: 'search',
            result: JSON.stringify('Second result'),
          },
          {
            _tag: 'text',
            text: 'What should I do next?',
          },
        ],
      });

      const input = yield* preprocessAiInput([message]);
      expect(input.messages).toHaveLength(3);

      // First: user text.
      expect(input.messages[0]).toBeInstanceOf(AiInput.UserMessage);
      const firstMessage = input.messages[0] as AiInput.UserMessage;
      expect(firstMessage.parts).toEqual([new AiInput.TextPart({ text: 'Here are the results:' })]);

      // Second: tool results.
      expect(input.messages[1]).toBeInstanceOf(AiInput.ToolMessage);
      const toolMessage = input.messages[1] as AiInput.ToolMessage;
      expect(toolMessage.parts).toHaveLength(2);

      // Third: user text.
      expect(input.messages[2]).toBeInstanceOf(AiInput.UserMessage);
      const lastMessage = input.messages[2] as AiInput.UserMessage;
      expect(lastMessage.parts).toEqual([new AiInput.TextPart({ text: 'What should I do next?' })]);
    }),
  );

  it.effect(
    'should handle assistant message with various block types',
    Effect.fn(function* ({ expect }) {
      const message = Obj.make(DataType.Message, {
        created: new Date().toISOString(),
        sender: { role: 'assistant' },
        blocks: [
          { _tag: 'status', statusText: 'Processing...' },
          { _tag: 'suggest', text: 'Try this approach' },
          { _tag: 'select', options: ['Option A', 'Option B'] },
          { _tag: 'proposal', text: 'I propose we do this' },
          { _tag: 'toolkit' },
          { _tag: 'json', data: '{"key": "value"}' },
        ],
      });

      const input = yield* preprocessAiInput([message]);
      const assistantMessage = input.messages[0] as AiInput.AssistantMessage;
      expect(assistantMessage.parts).toHaveLength(6);

      expect(assistantMessage.parts[0]).toEqual(
        new AiInput.TextPart({
          text: '<status>Processing...</status>',
        }),
      );
      expect(assistantMessage.parts[1]).toEqual(
        new AiInput.TextPart({
          text: '<suggest>Try this approach</suggest>',
        }),
      );
      expect(assistantMessage.parts[2]).toEqual(
        new AiInput.TextPart({
          text: '<select><option>Option A</option><option>Option B</option></select>',
        }),
      );
      expect(assistantMessage.parts[3]).toEqual(
        new AiInput.TextPart({
          text: '<proposal>I propose we do this</proposal>',
        }),
      );
      expect(assistantMessage.parts[4]).toEqual(
        new AiInput.TextPart({
          text: '<toolkit/>',
        }),
      );
      expect(assistantMessage.parts[5]).toEqual(
        new AiInput.TextPart({
          text: '{"key": "value"}',
        }),
      );
    }),
  );

  it.effect(
    'should fail when user message contains invalid blocks',
    Effect.fn(function* ({ expect }) {
      const message = Obj.make(DataType.Message, {
        created: new Date().toISOString(),
        sender: { role: 'user' },
        blocks: [
          {
            _tag: 'toolCall',
            toolCallId: 'call_1',
            name: 'test',
            input: '{}',
          },
        ],
      });

      const result = yield* Effect.either(preprocessAiInput([message]));
      expect(Either.isLeft(result)).toBe(true);
      if (Either.isLeft(result)) {
        expect(result.left).toBeInstanceOf(AiInputPreprocessingError);
      }
    }),
  );

  it.effect(
    'should fail when assistant message contains invalid blocks',
    Effect.fn(function* ({ expect }) {
      const message = Obj.make(DataType.Message, {
        created: new Date().toISOString(),
        sender: { role: 'assistant' },
        blocks: [
          {
            _tag: 'toolResult',
            toolCallId: 'call_1',
            name: 'test',
            result: 'Invalid in assistant',
          },
        ],
      });

      const result = yield* Effect.either(preprocessAiInput([message]));
      expect(Either.isLeft(result)).toBe(true);
      if (Either.isLeft(result)) {
        expect(result.left).toBeInstanceOf(AiInputPreprocessingError);
      }
    }),
  );

  it.effect(
    'should fail on invalid reasoning block',
    Effect.fn(function* ({ expect }) {
      const message = Obj.make(DataType.Message, {
        created: new Date().toISOString(),
        sender: { role: 'assistant' },
        blocks: [
          {
            _tag: 'reasoning',
            reasoningText: 'Some reasoning',
            redactedText: 'Some redacted text', // Both should not be present.
          },
        ],
      });

      const result = yield* Effect.either(preprocessAiInput([message]));
      expect(Either.isLeft(result)).toBe(true);
      if (Either.isLeft(result)) {
        expect(result.left).toBeInstanceOf(AiInputPreprocessingError);
      }
    }),
  );

  it.effect(
    'should handle multiple messages',
    Effect.fn(function* ({ expect }) {
      const messages = [
        Obj.make(DataType.Message, {
          created: new Date().toISOString(),
          sender: { role: 'user' },
          blocks: [{ _tag: 'text', text: 'Hello' }],
        }),
        Obj.make(DataType.Message, {
          created: new Date().toISOString(),
          sender: { role: 'assistant' },
          blocks: [{ _tag: 'text', text: 'Hi there!' }],
        }),
      ];

      const input = yield* preprocessAiInput(messages);
      expect(input.messages).toHaveLength(2);
      expect(input.messages[0]).toBeInstanceOf(AiInput.UserMessage);
      expect(input.messages[1]).toBeInstanceOf(AiInput.AssistantMessage);
    }),
  );
});
