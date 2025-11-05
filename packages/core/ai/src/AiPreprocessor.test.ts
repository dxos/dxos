//
// Copyright 2025 DXOS.org
//

import * as Prompt from '@effect/ai/Prompt';
import { describe, it } from '@effect/vitest';
import * as Effect from 'effect/Effect';
import * as Either from 'effect/Either';

import { Obj } from '@dxos/echo';
import { DataType } from '@dxos/schema';
import { bufferToArray } from '@dxos/util';

import { preprocessPrompt } from './AiPreprocessor';
import { PromptPreprocessingError } from './errors';

describe('preprocessor', () => {
  it.effect(
    'should preprocess simple user message with text',
    Effect.fn(function* ({ expect }) {
      const message = Obj.make(DataType.Message.Message, {
        created: new Date().toISOString(),
        sender: { role: 'user' },
        blocks: [
          {
            _tag: 'text',
            text: 'What is 2 + 2?',
          },
        ],
      });
      const input = yield* preprocessPrompt([message]);
      expect(input).toEqual(
        Prompt.fromMessages([
          Prompt.makeMessage('user', {
            content: [Prompt.makePart('text', { text: 'What is 2 + 2?' })],
          }),
        ]),
      );
    }),
  );

  it.effect(
    'should handle multiple tool results at the start of a message',
    Effect.fn(function* ({ expect }) {
      const message = Obj.make(DataType.Message.Message, {
        created: new Date().toISOString(),
        sender: { role: 'tool' },
        blocks: [
          {
            _tag: 'toolResult',
            toolCallId: 'call_1',
            name: 'calculator',
            result: JSON.stringify('Result of tool 1'),
            providerExecuted: false,
          },
          {
            _tag: 'toolResult',
            toolCallId: 'call_2',
            name: 'calculator',
            result: JSON.stringify('Result of tool 2'),
            providerExecuted: false,
          },
        ],
      });

      const input = yield* preprocessPrompt([message]);
      expect(input.content).toHaveLength(1);

      // First message should be tool results.
      expect(input.content[0].role).toBe('tool');
      const toolMessage = input.content[0] as Prompt.ToolMessage;
      expect(toolMessage.content).toHaveLength(2);
      expect(toolMessage.content[0]).toEqual(
        Prompt.makePart('tool-result', {
          id: 'call_1',
          name: 'calculator',
          result: 'Result of tool 1',
        }),
      );
      expect(toolMessage.content[1]).toEqual(
        Prompt.makePart('tool-result', {
          id: 'call_2',
          name: 'calculator',
          result: 'Result of tool 2',
        }),
      );
    }),
  );

  it.effect(
    'should handle assistant message with tool calls',
    Effect.fn(function* ({ expect }) {
      const message = Obj.make(DataType.Message.Message, {
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
            providerExecuted: false,
          },
          {
            _tag: 'text',
            text: 'Let me process that for you.',
          },
        ],
      });

      const input = yield* preprocessPrompt([message]);
      expect(input.content).toHaveLength(1);

      const assistantMessage = input.content[0] as Prompt.AssistantMessage;
      expect(assistantMessage.content).toHaveLength(3);
      expect(assistantMessage.content[0]).toEqual(Prompt.makePart('text', { text: 'I need to calculate something.' }));
      expect(assistantMessage.content[1]).toEqual(
        Prompt.makePart('tool-call', {
          id: 'call_1',
          name: 'calculator',
          params: { operation: 'add', a: 2, b: 2 },
          providerExecuted: false,
        }),
      );
      expect(assistantMessage.content[2]).toEqual(Prompt.makePart('text', { text: 'Let me process that for you.' }));
    }),
  );

  it.effect(
    'should handle assistant message with reasoning',
    Effect.fn(function* ({ expect }) {
      const message = Obj.make(DataType.Message.Message, {
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

      const input = yield* preprocessPrompt([message]);
      const assistantMessage = input.content[0] as Prompt.AssistantMessage;
      expect(assistantMessage.content[0]).toEqual(
        Prompt.makePart('reasoning', {
          text: 'Let me think about this step by step...',
          options: {
            anthropic: {
              type: 'thinking',
              signature: 'reasoning_sig_1',
            },
          },
        }),
      );
    }),
  );

  it.effect(
    'should handle redacted reasoning',
    Effect.fn(function* ({ expect }) {
      const message = Obj.make(DataType.Message.Message, {
        created: new Date().toISOString(),
        sender: { role: 'assistant' },
        blocks: [
          {
            _tag: 'reasoning',
            redactedText: '[Reasoning redacted]',
          },
        ],
      });

      const input = yield* preprocessPrompt([message]);
      const assistantMessage = input.content[0] as Prompt.AssistantMessage;
      expect(assistantMessage.content[0]).toEqual(
        Prompt.makePart('reasoning', {
          text: '',
          options: {
            anthropic: {
              type: 'redacted_thinking',
              redactedData: '[Reasoning redacted]',
            },
          },
        }),
      );
    }),
  );

  it.effect(
    'should handle user message with image (base64)',
    Effect.fn(function* ({ expect }) {
      const message = Obj.make(DataType.Message.Message, {
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

      const input = yield* preprocessPrompt([message]);
      const userMessage = input.content[0] as Prompt.UserMessage;
      expect(userMessage.content[0]).toEqual(
        Prompt.makePart('file', {
          mediaType: 'image/png',
          data: bufferToArray(
            Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChAGA', 'base64'),
          ),
        }),
      );
    }),
  );

  it.effect(
    'should handle user message with image (URL)',
    Effect.fn(function* ({ expect }) {
      const message = Obj.make(DataType.Message.Message, {
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

      const input = yield* preprocessPrompt([message]);
      const userMessage = input.content[0] as Prompt.UserMessage;
      expect(userMessage.content[0]).toEqual(
        Prompt.makePart('file', {
          mediaType: 'application/octet-stream',
          data: new URL('https://example.com/image.png'),
        }),
      );
    }),
  );

  it.effect(
    'should handle user message with file reference',
    Effect.fn(function* ({ expect }) {
      const message = Obj.make(DataType.Message.Message, {
        created: new Date().toISOString(),
        sender: { role: 'user' },
        blocks: [
          {
            _tag: 'file',
            mediaType: 'application/pdf',
            url: 'https://example.com/document.pdf',
          },
        ],
      });

      const input = yield* preprocessPrompt([message]);
      const userMessage = input.content[0] as Prompt.UserMessage;
      expect(userMessage.content[0]).toEqual(
        Prompt.makePart('file', {
          mediaType: 'application/pdf',
          data: new URL('https://example.com/document.pdf'),
        }),
      );
    }),
  );

  it.effect(
    'should handle user message with transcript',
    Effect.fn(function* ({ expect }) {
      const message = Obj.make(DataType.Message.Message, {
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

      const input = yield* preprocessPrompt([message]);
      const userMessage = input.content[0] as Prompt.UserMessage;
      expect(userMessage.content[0]).toEqual(
        Prompt.makePart('text', {
          text: 'This is a transcript of the conversation.',
        }),
      );
    }),
  );

  it.effect(
    'should handle assistant message with various block types',
    Effect.fn(function* ({ expect }) {
      const message = Obj.make(DataType.Message.Message, {
        created: new Date().toISOString(),
        sender: { role: 'assistant' },
        blocks: [
          { _tag: 'status', statusText: 'Processing...' },
          { _tag: 'suggestion', text: 'Try this approach' },
          { _tag: 'select', options: ['Option A', 'Option B'] },
          { _tag: 'proposal', text: 'I propose we do this' },
          { _tag: 'toolkit' },
          { _tag: 'json', data: '{"key": "value"}' },
        ],
      });

      const input = yield* preprocessPrompt([message]);
      const assistantMessage = input.content[0] as Prompt.AssistantMessage;
      expect(assistantMessage.content).toHaveLength(6);

      expect(assistantMessage.content[0]).toEqual(
        Prompt.makePart('text', {
          text: '<status>Processing...</status>',
        }),
      );
      expect(assistantMessage.content[1]).toEqual(
        Prompt.makePart('text', {
          text: '<suggestion>Try this approach</suggestion>',
        }),
      );
      expect(assistantMessage.content[2]).toEqual(
        Prompt.makePart('text', {
          text: '<select><option>Option A</option><option>Option B</option></select>',
        }),
      );
      expect(assistantMessage.content[3]).toEqual(
        Prompt.makePart('text', {
          text: '<proposal>I propose we do this</proposal>',
        }),
      );
      expect(assistantMessage.content[4]).toEqual(
        Prompt.makePart('text', {
          text: '<toolkit/>',
        }),
      );
      expect(assistantMessage.content[5]).toEqual(
        Prompt.makePart('text', {
          text: '{"key": "value"}',
        }),
      );
    }),
  );

  it.effect(
    'should fail when user message contains invalid blocks',
    Effect.fn(function* ({ expect }) {
      const message = Obj.make(DataType.Message.Message, {
        created: new Date().toISOString(),
        sender: { role: 'user' },
        blocks: [
          {
            _tag: 'toolCall',
            toolCallId: 'call_1',
            name: 'test',
            input: '{}',
            providerExecuted: false,
          },
        ],
      });

      const result = yield* Effect.either(preprocessPrompt([message]));
      expect(Either.isLeft(result)).toBe(true);
      if (Either.isLeft(result)) {
        expect(result.left).toBeInstanceOf(PromptPreprocessingError);
      }
    }),
  );

  it.effect(
    'handles provider-executed tool results',
    Effect.fn(function* ({ expect }) {
      const message = Obj.make(DataType.Message.Message, {
        created: new Date().toISOString(),
        sender: { role: 'assistant' },
        blocks: [
          {
            _tag: 'toolResult',
            toolCallId: 'call_1',
            name: 'test',
            result: JSON.stringify('Testing'),
            providerExecuted: true,
          },
        ],
      });

      const result = yield* preprocessPrompt([message]);
      expect(result.content).toHaveLength(1);
      expect(result.content[0].role).toBe('assistant');
      expect(result.content[0].content).toEqual([
        Prompt.makePart('tool-result', {
          id: 'call_1',
          name: 'test',
          result: 'Testing',
        }),
      ]);
    }),
  );

  it.effect(
    'should handle multiple messages',
    Effect.fn(function* ({ expect }) {
      const messages = [
        Obj.make(DataType.Message.Message, {
          created: new Date().toISOString(),
          sender: { role: 'user' },
          blocks: [{ _tag: 'text', text: 'Hello' }],
        }),
        Obj.make(DataType.Message.Message, {
          created: new Date().toISOString(),
          sender: { role: 'assistant' },
          blocks: [{ _tag: 'text', text: 'Hi there!' }],
        }),
      ];

      const input = yield* preprocessPrompt(messages);
      expect(input.content).toHaveLength(2);
      expect(input.content[0].role).toBe('user');
      expect(input.content[1].role).toBe('assistant');
    }),
  );
});
