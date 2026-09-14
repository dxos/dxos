//
// Copyright 2025 DXOS.org
//

import { describe, it } from '@effect/vitest';
import * as Effect from 'effect/Effect';
import * as Result from 'effect/Result';
import * as Prompt from 'effect/unstable/ai/Prompt';

import { Obj } from '@dxos/echo';
import { ContentBlock, Message } from '@dxos/types';
import { bufferToArray } from '@dxos/util';

import * as AiPreprocessor from './AiPreprocessor.ts';
import { PromptPreprocessingError } from './errors.ts';
import { TestData } from './testing/index.ts';

describe('AiPreprocessor.preprocessPrompt', () => {
  it.effect(
    'should preprocess simple user message with text',
    Effect.fn(function* ({ expect }) {
      const message = makeMessage('user', [
        {
          _tag: 'text',
          text: 'What is 2 + 2?',
        },
      ]);
      const input = yield* AiPreprocessor.preprocessPrompt([message]);
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
    'drops tool results at the start of a message when there is no matching tool call',
    Effect.fn(function* ({ expect }) {
      const message = makeMessage('tool', [
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
      ]);

      const input = yield* AiPreprocessor.preprocessPrompt([message]);
      expect(input.content).toHaveLength(0);
    }),
  );

  it.effect(
    'should handle assistant message with tool calls',
    Effect.fn(function* ({ expect }) {
      const messages = [
        makeMessage('assistant', [
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
        ]),
        makeMessage('tool', [
          {
            _tag: 'toolResult',
            toolCallId: 'call_1',
            name: 'calculator',
            result: JSON.stringify('Result of tool 1'),
            providerExecuted: false,
          },
        ]),
      ];

      const input = yield* AiPreprocessor.preprocessPrompt(messages);
      expect(input.content).toHaveLength(2);

      const assistantMessage = input.content[0] as Prompt.AssistantMessage;
      expect(assistantMessage.content).toHaveLength(2);
      expect(assistantMessage.content[0]).toEqual(Prompt.makePart('text', { text: 'I need to calculate something.' }));
      expect(assistantMessage.content[1]).toEqual(
        Prompt.makePart('tool-call', {
          id: 'call_1',
          name: 'calculator',
          params: { operation: 'add', a: 2, b: 2 },
          providerExecuted: false,
        }),
      );
    }),
  );

  it.effect(
    'should handle assistant message with reasoning',
    Effect.fn(function* ({ expect }) {
      const message = makeMessage('assistant', [
        {
          _tag: 'reasoning',
          reasoningText: 'Let me think about this step by step...',
          signature: 'reasoning_sig_1',
        },
        {
          _tag: 'text',
          text: 'Based on my reasoning, the answer is 4.',
        },
      ]);

      const input = yield* AiPreprocessor.preprocessPrompt([message]);
      const assistantMessage = input.content[0] as Prompt.AssistantMessage;
      expect(assistantMessage.content[0]).toEqual(
        Prompt.makePart('reasoning', {
          text: 'Let me think about this step by step...',
          options: {
            anthropic: {
              info: {
                type: 'thinking',
                signature: 'reasoning_sig_1',
              },
            },
          },
        }),
      );
    }),
  );

  it.effect(
    'should handle redacted reasoning',
    Effect.fn(function* ({ expect }) {
      const message = makeMessage('assistant', [
        {
          _tag: 'reasoning',
          redactedText: '[Reasoning redacted]',
        },
      ]);

      const input = yield* AiPreprocessor.preprocessPrompt([message]);
      const assistantMessage = input.content[0] as Prompt.AssistantMessage;
      expect(assistantMessage.content[0]).toEqual(
        Prompt.makePart('reasoning', {
          text: '',
          options: {
            anthropic: {
              info: {
                type: 'redacted_thinking',
                redactedData: '[Reasoning redacted]',
              },
            },
          },
        }),
      );
    }),
  );

  it.effect(
    'should handle reasoning without signature or redacted text',
    Effect.fn(function* ({ expect }) {
      const message = makeMessage('assistant', [
        {
          _tag: 'reasoning',
          reasoningText: 'Thinking without a signature...',
        },
      ]);

      const input = yield* AiPreprocessor.preprocessPrompt([message]);
      const assistantMessage = input.content[0] as Prompt.AssistantMessage;
      expect(assistantMessage.content[0]).toEqual(
        Prompt.makePart('reasoning', {
          text: 'Thinking without a signature...',
        }),
      );
    }),
  );

  it.effect(
    'should handle user message with image (base64)',
    Effect.fn(function* ({ expect }) {
      const message = makeMessage('user', [
        {
          _tag: 'image',
          source: {
            type: 'base64',
            mediaType: 'image/png',
            data: 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChAGA', // 1x1 transparent PNG
          },
        },
      ]);

      const input = yield* AiPreprocessor.preprocessPrompt([message]);
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
      const message = makeMessage('user', [
        {
          _tag: 'image',
          source: {
            type: 'http',
            url: 'https://example.com/image.png',
          },
        },
      ]);

      const input = yield* AiPreprocessor.preprocessPrompt([message]);
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
      const message = makeMessage('user', [
        {
          _tag: 'file',
          mediaType: 'application/pdf',
          url: 'https://example.com/document.pdf',
        },
      ]);

      const input = yield* AiPreprocessor.preprocessPrompt([message]);
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
      const message = makeMessage('user', [
        {
          _tag: 'transcript',
          text: 'This is a transcript of the conversation.',
          started: new Date().toISOString(),
        },
      ]);

      const input = yield* AiPreprocessor.preprocessPrompt([message]);
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
      const message = makeMessage('assistant', [
        { _tag: 'status', statusText: 'Processing...' },
        { _tag: 'suggestion', text: 'Try this approach' },
        { _tag: 'select', options: ['Option A', 'Option B'] },
        { _tag: 'proposal', text: 'I propose we do this' },
        { _tag: 'toolkit' },
        { _tag: 'json', data: '{"key": "value"}' },
      ]);

      const input = yield* AiPreprocessor.preprocessPrompt([message]);
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
      const message = makeMessage('user', [
        {
          _tag: 'toolCall',
          toolCallId: 'call_1',
          name: 'test',
          input: '{}',
          providerExecuted: false,
        },
      ]);

      const result = yield* Effect.result(AiPreprocessor.preprocessPrompt([message]));
      expect(Result.isFailure(result)).toBe(true);
      if (Result.isFailure(result)) {
        expect(result.failure).toBeInstanceOf(PromptPreprocessingError);
      }
    }),
  );

  it.effect(
    'handles provider-executed tool calls and matching tool results in the assistant message',
    Effect.fn(function* ({ expect }) {
      const message = makeMessage('assistant', [
        {
          _tag: 'toolCall',
          toolCallId: 'call_1',
          name: 'test',
          input: '{}',
          providerExecuted: true,
        },
        {
          _tag: 'toolResult',
          toolCallId: 'call_1',
          name: 'test',
          result: JSON.stringify('Testing'),
          providerExecuted: true,
        },
      ]);

      const result = yield* AiPreprocessor.preprocessPrompt([message]);
      expect(result.content).toHaveLength(1);
      expect(result.content[0].role).toBe('assistant');
      expect(result.content[0].content).toEqual([
        Prompt.makePart('tool-call', {
          id: 'call_1',
          name: 'test',
          params: {},
          providerExecuted: true,
        }),
        Prompt.makePart('tool-result', {
          id: 'call_1',
          name: 'test',
          result: 'Testing',
          isFailure: false,
          providerExecuted: false,
        }),
      ]);
    }),
  );

  it.effect(
    'should handle multiple messages',
    Effect.fn(function* ({ expect }) {
      const messages = [
        makeMessage('user', [{ _tag: 'text', text: 'Hello' }]),
        makeMessage('assistant', [{ _tag: 'text', text: 'Hi there!' }]),
      ];

      const input = yield* AiPreprocessor.preprocessPrompt(messages);
      expect(input.content).toHaveLength(2);
      expect(input.content[0].role).toBe('user');
      expect(input.content[1].role).toBe('assistant');
    }),
  );

  it.effect(
    'should trim messages before assistant summary',
    Effect.fn(function* ({ expect }) {
      const messages = [
        makeMessage('user', [{ _tag: 'text', text: 'Old question' }]),
        makeMessage('assistant', [
          { _tag: 'text', text: 'Old answer' },
          { _tag: 'summary', content: 'User asked an old question.' },
        ]),
        makeMessage('user', [{ _tag: 'text', text: 'New question' }]),
      ];

      const input = yield* AiPreprocessor.preprocessPrompt(messages);
      expect(input.content).toHaveLength(2);
      expect(input.content[0].role).toBe('assistant');
      expect((input.content[0] as Prompt.AssistantMessage).content).toEqual([
        Prompt.makePart('text', {
          text: 'This is the continuation of a conversation that was compacted to preserve context-window space. Summary of what happened in this conversation previously: <summary>User asked an old question.</summary>',
        }),
      ]);
      expect(input.content[1].role).toBe('user');
      expect((input.content[1] as Prompt.UserMessage).content).toEqual([
        Prompt.makePart('text', { text: 'New question' }),
      ]);
    }),
  );

  it.effect(
    'should fail when user message contains a summary block',
    Effect.fn(function* ({ expect }) {
      const messages = [makeMessage('user', [{ _tag: 'summary', content: 'Bad summary' }])];

      const result = yield* Effect.result(AiPreprocessor.preprocessPrompt(messages));
      expect(Result.isFailure(result)).toBe(true);
      if (Result.isFailure(result)) {
        expect(result.failure).toBeInstanceOf(PromptPreprocessingError);
      }
    }),
  );

  it.effect(
    'should compensate for missing tool results in the middle of a message',
    Effect.fn(function* ({ expect }) {
      const messages = [
        makeMessage('assistant', [
          { _tag: 'text', text: 'I need to calculate something.' },
          { _tag: 'toolCall', toolCallId: 'call_1', name: 'calculator', input: '{}', providerExecuted: false }, // missing tool result
          { _tag: 'text', text: 'Let me process that for you.' },
        ]),
      ];

      const input = yield* AiPreprocessor.preprocessPrompt(messages);
      expect(input.content.map((x) => x.role)).toEqual(['assistant', 'tool', 'assistant']);
    }),
  );

  it.effect(
    'should compensate for missing tool results at the end of a message',
    Effect.fn(function* ({ expect }) {
      const messages = [
        makeMessage('assistant', [
          { _tag: 'text', text: 'I need to calculate something.' },
          { _tag: 'toolCall', toolCallId: 'call_1', name: 'calculator', input: '{}', providerExecuted: false }, // missing tool result
        ]),
      ];

      const input = yield* AiPreprocessor.preprocessPrompt(messages);
      expect(input.content.map((x) => x.role)).toEqual(['assistant', 'tool']);
    }),
  );

  it.effect(
    'doesnt compensate for satisfied tool calls',
    Effect.fn(function* ({ expect }) {
      const messages = [
        makeMessage('assistant', [
          { _tag: 'text', text: 'I need to calculate something.' },
          { _tag: 'toolCall', toolCallId: 'call_1', name: 'calculator', input: '{}', providerExecuted: false },
          { _tag: 'toolCall', toolCallId: 'call_2', name: 'calculator', input: '{}', providerExecuted: false },
        ]),
        makeMessage('tool', [
          { _tag: 'toolResult', toolCallId: 'call_1', name: 'calculator', result: '10', providerExecuted: false },
          { _tag: 'toolResult', toolCallId: 'call_2', name: 'calculator', result: '10', providerExecuted: false },
        ]),
        makeMessage('assistant', [{ _tag: 'text', text: 'The result is 10.' }]),
      ];

      const input = yield* AiPreprocessor.preprocessPrompt(messages);
      expect(input.content.map((x) => x.role)).toEqual(['assistant', 'tool', 'assistant']);
      expect(input.content[1].content.length).toEqual(2);
    }),
  );

  it.effect(
    'drops duplicate tool results for the same tool call id',
    Effect.fn(function* ({ expect }) {
      const messages = [
        makeMessage('assistant', [
          { _tag: 'toolCall', toolCallId: 'call_1', name: 'calculator', input: '{}', providerExecuted: false },
        ]),
        makeMessage('tool', [
          {
            _tag: 'toolResult',
            toolCallId: 'call_1',
            name: 'calculator',
            result: JSON.stringify('first'),
            providerExecuted: false,
          },
          {
            _tag: 'toolResult',
            toolCallId: 'call_1',
            name: 'calculator',
            result: JSON.stringify('second'),
            providerExecuted: false,
          },
        ]),
      ];

      const input = yield* AiPreprocessor.preprocessPrompt(messages);
      const toolMsg = input.content[1] as Prompt.ToolMessage;
      expect(toolMsg.content).toHaveLength(1);
      expect(toolMsg.content[0]).toEqual(
        Prompt.makePart('tool-result', {
          id: 'call_1',
          name: 'calculator',
          result: 'first',
          isFailure: false,
          providerExecuted: false,
        }),
      );
    }),
  );

  it.effect(
    'drops providerExecuted tool calls without results',
    Effect.fn(function* ({ expect }) {
      const message = makeMessage('assistant', [
        { _tag: 'text', text: 'I need to calculate something.' },
        { _tag: 'toolCall', toolCallId: 'call_1', name: 'web_search', input: '{}', providerExecuted: true },
        { _tag: 'text', text: 'Let me process that for you.' },
      ]);

      const input = yield* AiPreprocessor.preprocessPrompt([message]);
      expect(input.content).toHaveLength(1);
      expect(input.content).toEqual([
        Prompt.makeMessage('assistant', {
          content: [
            Prompt.makePart('text', { text: 'I need to calculate something.' }),
            Prompt.makePart('text', { text: 'Let me process that for you.' }),
          ],
        }),
      ]);
    }),
  );

  it.effect(
    'fails gracefully when a tool-result has malformed JSON in the result field',
    Effect.fn(function* ({ expect }) {
      const messages = [
        makeMessage('assistant', [
          { _tag: 'toolCall', toolCallId: 'call_1', name: 'calculator', input: '{}', providerExecuted: false },
        ]),
        makeMessage('tool', [
          {
            _tag: 'toolResult',
            toolCallId: 'call_1',
            name: 'calculator',
            result: '{not valid json',
            providerExecuted: false,
          },
        ]),
      ];

      const result = yield* Effect.result(AiPreprocessor.preprocessPrompt(messages));
      expect(Result.isFailure(result)).toBe(true);
      if (Result.isFailure(result)) {
        expect(result.failure).toBeInstanceOf(PromptPreprocessingError);
      }
    }),
  );

  it.effect(
    'passes the raw string through when an assistant tool-call has malformed JSON in the input field',
    Effect.fn(function* ({ expect }) {
      // The model authors this field, so it can be malformed; the block is durable, so failing the
      // request would make every later request over the same conversation fail too.
      const malformed = '{"objects": echo://BPB}';
      const message = makeMessage('assistant', [
        { _tag: 'toolCall', toolCallId: 'call_1', name: 'calculator', input: malformed, providerExecuted: false },
      ]);

      const input = yield* AiPreprocessor.preprocessPrompt([message]);
      const assistantMessage = input.content[0] as Prompt.AssistantMessage;
      expect(assistantMessage.content[0]).toEqual(
        Prompt.makePart('tool-call', {
          id: 'call_1',
          name: 'calculator',
          params: { raw: malformed },
          providerExecuted: false,
        }),
      );
    }),
  );

  it.effect(
    'keeps a conversation usable after a tool-call with malformed input',
    Effect.fn(function* ({ expect }) {
      // The shape `callTool` produces for unparseable input: the call never ran, and the paired
      // error result is what tells the model to retry.
      const messages = [
        makeMessage('assistant', [
          { _tag: 'toolCall', toolCallId: 'call_1', name: 'calculator', input: '{not valid', providerExecuted: false },
        ]),
        makeMessage('tool', [
          {
            _tag: 'toolResult',
            toolCallId: 'call_1',
            name: 'calculator',
            error: "Invalid JSON arguments for tool 'calculator'. Retry the call with valid JSON.",
            providerExecuted: false,
          },
        ]),
        makeMessage('user', [{ _tag: 'text', text: 'try again' }]),
      ];

      const input = yield* AiPreprocessor.preprocessPrompt(messages);
      expect(input.content).toHaveLength(3);
      const toolMessage = input.content[1] as Prompt.ToolMessage;
      expect(toolMessage.content[0]).toEqual(
        Prompt.makePart('tool-result', {
          id: 'call_1',
          name: 'calculator',
          result: "Invalid JSON arguments for tool 'calculator'. Retry the call with valid JSON.",
          isFailure: true,
          providerExecuted: false,
        }),
      );
    }),
  );

  it.effect(
    'marks tool-result as isFailure when block.error is set (tool message)',
    Effect.fn(function* ({ expect }) {
      const messages = [
        makeMessage('assistant', [
          { _tag: 'toolCall', toolCallId: 'call_1', name: 'calculator', input: '{}', providerExecuted: false },
        ]),
        makeMessage('tool', [
          {
            _tag: 'toolResult',
            toolCallId: 'call_1',
            name: 'calculator',
            error: 'division by zero',
            providerExecuted: false,
          },
        ]),
      ];

      const input = yield* AiPreprocessor.preprocessPrompt(messages);
      const toolMsg = input.content[1] as Prompt.ToolMessage;
      expect(toolMsg.content[0]).toEqual(
        Prompt.makePart('tool-result', {
          id: 'call_1',
          name: 'calculator',
          result: 'division by zero',
          isFailure: true,
          providerExecuted: false,
        }),
      );
    }),
  );

  it.effect(
    'marks tool-result as isFailure when block.error is set (provider-executed in assistant message)',
    Effect.fn(function* ({ expect }) {
      const message = makeMessage('assistant', [
        { _tag: 'toolCall', toolCallId: 'call_1', name: 'web_search', input: '{}', providerExecuted: true },
        {
          _tag: 'toolResult',
          toolCallId: 'call_1',
          name: 'web_search',
          error: 'rate limited',
          providerExecuted: true,
        },
      ]);

      const input = yield* AiPreprocessor.preprocessPrompt([message]);
      const assistantMsg = input.content[0] as Prompt.AssistantMessage;
      expect(assistantMsg.content[1]).toEqual(
        Prompt.makePart('tool-result', {
          id: 'call_1',
          name: 'web_search',
          result: 'rate limited',
          isFailure: true,
          providerExecuted: false,
        }),
      );
    }),
  );

  it.effect(
    'expands ContentBlockResult tool messages into stub tool-results and a user message with blocks',
    Effect.fn(function* ({ expect }) {
      const pdfBytes = bufferToArray(Buffer.from('JVBERi0x', 'base64'));
      const messages = [
        makeMessage('assistant', [
          {
            _tag: 'toolCall',
            toolCallId: 'call_1',
            name: 'getPdf',
            input: '{}',
            providerExecuted: false,
          },
        ]),
        makeMessage('tool', [
          {
            _tag: 'toolResult',
            toolCallId: 'call_1',
            name: 'getPdf',
            result: ContentBlock.ContentBlockResult.make({
              content: [
                ContentBlock.Text.make({ text: 'summary' }),
                ContentBlock.File.make({
                  name: 'file.pdf',
                  mediaType: 'application/pdf',
                  url: Buffer.from(pdfBytes).toString('base64'),
                }),
              ],
            }),
            providerExecuted: false,
          },
        ]),
      ];

      const input = yield* AiPreprocessor.preprocessPrompt(messages);
      expect(input.content).toHaveLength(3);

      const toolMessage = input.content[1] as Prompt.ToolMessage;
      expect(toolMessage.role).toBe('tool');
      expect(toolMessage.content).toEqual([
        Prompt.makePart('tool-result', {
          id: 'call_1',
          name: 'getPdf',
          result: 'See result for call_1 below',
          isFailure: false,
          providerExecuted: false,
        }),
      ]);

      const userMessage = input.content[2] as Prompt.UserMessage;
      expect(userMessage.role).toBe('user');
      expect(userMessage.content[0]).toEqual(Prompt.makePart('text', { text: 'Result from call_1:' }));
      expect(userMessage.content[1]).toEqual(Prompt.makePart('text', { text: 'summary' }));
      expect(userMessage.content[2]?.type).toBe('file');
    }),
  );
});

describe('AiPreprocessor.estimateTokens', () => {
  it.effect(
    'should estimate tokens for a simple user message with text',
    Effect.fn(function* ({ expect }) {
      const prompt = yield* AiPreprocessor.preprocessPrompt(yield* Effect.promise(TestData.internetOrderConversation));
      const tokens = yield* AiPreprocessor.estimateTokens(prompt);
      expect(tokens).toBeGreaterThan(0);
    }),
  );
});

const makeMessage = (role: 'user' | 'assistant' | 'tool', blocks: ContentBlock.Any[]): Message.Message => {
  return Obj.make(Message.Message, {
    created: new Date().toISOString(),
    sender: { role },
    blocks,
  });
};
